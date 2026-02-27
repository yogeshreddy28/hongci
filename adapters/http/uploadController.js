"use strict";

function createUploadController(deps) {
  var uploader = deps.uploader;
  var uploadStore = deps.uploadStore;

  return {
    upload: function (req, res) {
      uploader.single("file")(req, res, function (err) {
        if (err) {
          var msg = err && err.message ? err.message : "Upload failed.";
          return res.status(400).json({ ok: false, error: msg });
        }
        if (!req.file) {
          return res.status(400).json({ ok: false, error: "No file uploaded. Use field name 'file'." });
        }
        return res.json({
          ok: true,
          url: uploadStore.publicUrlForFilename(req.file.filename),
          filename: req.file.filename
        });
      });
    }
  };
}

module.exports = { createUploadController };
