package expo.modules.fodownloads

import android.content.ContentValues
import android.content.Intent
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

/**
 * Saves a file into the phone's public Downloads folder through MediaStore,
 * the way a browser download does. Android 10+ needs no permission for this,
 * and the file shows up in Files > Downloads straight away.
 */
class FoDownloadsModule : Module() {
  // PdfRenderer handles one page at a time per document; keep renders in line.
  private val pdfLock = Any()

  // "Open with" / "Share" from another app: the newest intent not yet handed to JS.
  private var pendingIntent: Intent? = null
  private var handledIntent: Intent? = null

  /** content:// or file:// addresses an intent carries: VIEW data, or SEND / SEND_MULTIPLE streams. */
  @Suppress("DEPRECATION")
  private fun urisOf(intent: Intent): List<Uri> =
    when (intent.action) {
      Intent.ACTION_VIEW -> listOfNotNull(intent.data)
      Intent.ACTION_SEND -> listOfNotNull(intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM) ?: intent.clipData?.takeIf { it.itemCount > 0 }?.getItemAt(0)?.uri)
      Intent.ACTION_SEND_MULTIPLE -> intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)?.toList()
        ?: intent.clipData?.let { c -> (0 until c.itemCount).mapNotNull { c.getItemAt(it).uri } }
        ?: emptyList()
      else -> emptyList()
    }.filter { it.scheme == "content" || it.scheme == "file" }

  /** Copies an incoming file into the app's cache so the viewer and tools can read it like any picked file. */
  private fun copyIn(uri: Uri, intentType: String?): Map<String, Any?>? {
    val context = appContext.reactContext ?: return null
    val resolver = context.contentResolver
    var name: String? = null
    var size: Long? = null
    if (uri.scheme == "content") {
      try {
        resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)?.use { c ->
          if (c.moveToFirst()) {
            val n = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            val s = c.getColumnIndex(OpenableColumns.SIZE)
            if (n >= 0 && !c.isNull(n)) name = c.getString(n)
            if (s >= 0 && !c.isNull(s)) size = c.getLong(s)
          }
        }
      } catch (_: Exception) {
        // Some providers don't answer queries; fall back to the address.
      }
    }
    val mime = (if (uri.scheme == "content") resolver.getType(uri) else null)
      ?: intentType?.takeIf { !it.contains('*') }
      ?: MimeTypeMap.getSingleton().getMimeTypeFromExtension(MimeTypeMap.getFileExtensionFromUrl(uri.toString()).lowercase())
      ?: "application/octet-stream"
    var display = (name ?: uri.lastPathSegment?.substringAfterLast('/') ?: "file").replace(Regex("[\\\\/:*?\"<>|\u0000-\u001f]"), "_").take(120)
    if (!display.contains('.')) MimeTypeMap.getSingleton().getExtensionFromMimeType(mime)?.let { display = "$display.$it" }

    val dir = File(context.cacheDir, "fo-incoming").apply { mkdirs() }
    // Clear out files from earlier visits (over a day old).
    dir.listFiles()?.forEach { f -> if (System.currentTimeMillis() - f.lastModified() > 86_400_000L) f.deleteRecursively() }
    val slot = File(dir, System.nanoTime().toString()).apply { mkdirs() }
    val out = File(slot, display)
    val input = if (uri.scheme == "file") File(uri.path ?: return null).inputStream() else resolver.openInputStream(uri) ?: return null
    input.use { inp -> out.outputStream().use { inp.copyTo(it) } }
    return mapOf("uri" to Uri.fromFile(out).toString(), "name" to display, "size" to (size ?: out.length()).toDouble(), "mimeType" to mime)
  }

  private fun opensFiles(intent: Intent?) = intent != null && urisOf(intent).isNotEmpty()

  private fun openPdf(uri: String): Pair<ParcelFileDescriptor, PdfRenderer> {
    val path = Uri.parse(uri).path ?: throw CodedException("ERR_BAD_URI", "Bad file address.", null)
    val fd = ParcelFileDescriptor.open(File(path), ParcelFileDescriptor.MODE_READ_ONLY)
    return try {
      fd to PdfRenderer(fd)
    } catch (e: Exception) {
      fd.close()
      // Password-protected or damaged: the caller falls back to another app.
      throw CodedException("ERR_PDF", "This PDF can't be shown here.", e)
    }
  }

  override fun definition() = ModuleDefinition {
    Name("FoDownloads")

    Events("onIncoming")

    // The app was already open: a new file arrives through onNewIntent.
    OnNewIntent { intent ->
      if (opensFiles(intent)) {
        pendingIntent = intent
        sendEvent("onIncoming", mapOf<String, Any?>())
      }
    }

    /**
     * Files another app asked us to open ("Open with") or shared to us, copied
     * into the cache. Each intent is handed over once; empty when there's none.
     */
    AsyncFunction("takeIncoming") {
      val launch = appContext.currentActivity?.intent
      // Reopening the app from Recents replays the old launch intent: ignore it.
      val fresh = launch?.takeIf { (it.flags and Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) == 0 }
      val intent = pendingIntent ?: fresh
      pendingIntent = null
      if (intent == null || intent === handledIntent || !opensFiles(intent)) return@AsyncFunction emptyList<Map<String, Any?>>()
      handledIntent = intent
      urisOf(intent).mapNotNull { uri ->
        try {
          copyIn(uri, intent.type)
        } catch (_: Exception) {
          null
        }
      }
    }

    /** Page sizes of a PDF (in points), for laying out the in-app viewer before pages are drawn. */
    AsyncFunction("pdfPages") { uri: String ->
      synchronized(pdfLock) {
        val (fd, pdf) = openPdf(uri)
        try {
          (0 until pdf.pageCount).map { i -> pdf.openPage(i).use { listOf(it.width, it.height) } }
        } finally {
          pdf.close()
          fd.close()
        }
      }
    }

    /**
     * Draws one page (0-based) `width` pixels wide with Android's own PDF
     * renderer and saves it as a JPEG in the cache. Resolves with its file URI.
     */
    AsyncFunction("renderPdfPage") { uri: String, index: Int, width: Int ->
      val context = appContext.reactContext ?: throw CodedException("ERR_NO_CONTEXT", "The app isn't ready yet.", null)
      val dir = File(context.cacheDir, "fo-pdf-pages").apply { mkdirs() }
      val out = File(dir, "${(uri.hashCode().toLong() and 0xffffffffL)}-$index-$width.jpg")
      if (out.exists() && out.length() > 0) return@AsyncFunction Uri.fromFile(out).toString()
      synchronized(pdfLock) {
        val (fd, pdf) = openPdf(uri)
        try {
          pdf.openPage(index).use { page ->
            val w = width.coerceIn(200, 3000)
            val h = (w.toDouble() * page.height / page.width).toInt().coerceAtLeast(1)
            val bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
            bitmap.eraseColor(Color.WHITE)
            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
            out.outputStream().use { bitmap.compress(Bitmap.CompressFormat.JPEG, 92, it) }
            bitmap.recycle()
          }
        } finally {
          pdf.close()
          fd.close()
        }
      }
      Uri.fromFile(out).toString()
    }

    Function("isSupported") { Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q }

    AsyncFunction("saveToDownloads") { sourceUri: String, name: String, mimeType: String ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) throw CodedException("ERR_UNSUPPORTED", "Saving to Downloads needs Android 10 or newer.", null)
      val context = appContext.reactContext ?: throw CodedException("ERR_NO_CONTEXT", "The app isn't ready yet.", null)
      val resolver = context.contentResolver
      val source = Uri.parse(sourceUri)
      val input = when (source.scheme) {
        "file" -> File(source.path ?: throw CodedException("ERR_BAD_URI", "Bad file address.", null)).inputStream()
        else -> resolver.openInputStream(source) ?: throw CodedException("ERR_READ", "Couldn't read the file.", null)
      }

      val values = ContentValues().apply {
        put(MediaStore.Downloads.DISPLAY_NAME, name)
        put(MediaStore.Downloads.MIME_TYPE, mimeType)
        put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
        put(MediaStore.Downloads.IS_PENDING, 1)
      }
      val target = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
        ?: throw CodedException("ERR_WRITE", "Couldn't create the file in Downloads.", null)
      try {
        input.use { inp ->
          resolver.openOutputStream(target)?.use { out -> inp.copyTo(out) } ?: throw CodedException("ERR_WRITE", "Couldn't write the file.", null)
        }
        resolver.update(target, ContentValues().apply { put(MediaStore.Downloads.IS_PENDING, 0) }, null, null)
      } catch (e: Exception) {
        resolver.delete(target, null, null)
        throw e
      }
      // Android may rename duplicates ("report (1).pdf"); report the name it kept.
      val kept = resolver.query(target, arrayOf(MediaStore.Downloads.DISPLAY_NAME), null, null, null)?.use { c ->
        if (c.moveToFirst()) c.getString(0) else null
      }
      kept ?: name
    }
  }
}
