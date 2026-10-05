package expo.modules.fodownloads

import android.content.ContentValues
import android.net.Uri
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
  override fun definition() = ModuleDefinition {
    Name("FoDownloads")

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
