const gcs = require("@google-cloud/storage")();
const spawn = require("child-process-promise").spawn;
const path = require("path");
const os = require("os");
const fs = require("fs");

function generateThumbnail(object) {
  const fileBucket = object.bucket;
  const filePath = object.name;
  const contentType = object.contentType;
  const fileName = path.basename(filePath);
  // Download file from bucket.
  const bucket = gcs.bucket(fileBucket);
  const tempFilePath = path.join(os.tmpdir(), fileName);
  const metadata = { contentType: contentType };
  return bucket
    .file(filePath)
    .download({
      destination: tempFilePath
    })
    .then(() => {
      console.log("Image downloaded locally to", tempFilePath);
      // Generate a thumbnail using ImageMagick.
      return spawn("convert", [
        tempFilePath,
        "-thumbnail",
        "200x200>",
        tempFilePath
      ]);
    })
    .then(() => {
      console.log("Thumbnail created at", tempFilePath);
      // We add a 'thumb_' prefix to thumbnails file name. That's where we'll upload the thumbnail.
      const thumbFileName = `thumb_${fileName}`;
      const thumbFilePath = path.join(path.dirname(filePath), thumbFileName);
      // Uploading the thumbnail.
      return bucket.upload(tempFilePath, {
        destination: thumbFilePath,
        metadata: metadata
      });
      // Once the thumbnail has been uploaded delete the local file to free up disk space.
    })
    .then(() => fs.unlinkSync(tempFilePath));
}

module.exports = generateThumbnail;
