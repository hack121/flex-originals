'use strict';

const multer = require('multer');
const fs = require('fs-extra');
const helper = require('./../../server/helper-util');
const path = require('path');
const app = require('../../server/server');
const ThumbnailGenerator = require('../../server/API/Video');

const VIDEO_EXT = ['video/mp4', 'video/x-msvideo'];
const AUDIO_EXT = ['audio/mpeg', 'audio/vnd.wav', 'audio/mp4', 'audio/ogg'];
const IMAGE_EXT = [
  'image/gif',
  'image/jpeg',
  'image/svg+xml',
  'image/x-icon',
  'image/png'
];
const EXTENSION = ['.png', '.jpeg', '.mp4', '.mp3', '.ogg', '.gif'];

module.exports = function(Action) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const userId = req.params.id;
      const dirPath = `uploads/${userId}`;
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
      }
      const sectionPath = path.join(dirPath, helper.randomId());
      fs.mkdirSync(sectionPath);
      const filePath = path.join(sectionPath, req.params.type);
      fs.mkdirSync(filePath);
      cb(null, filePath);
    },

    filename: (req, file, cb) => {
      cb(null, file.originalname);
    }
  });

  Action.upload = (req, res) => {
    const Videos = app.models.Videos;
    const Audios = app.models.Audio;
    const upload = multer({
      storage: storage,
      fileFilter: function(req, file, callback) {
        var ext = path.extname(file.originalname);
        if (EXTENSION.indexOf(ext) == -1) {
          return callback(new Error('Only images are allowed'));
        }
        callback(null, true);
      },
      limits: {
        fileSize: 1024 * 1024 * 1024 * 1024
      }
    }).single('file');

    upload(req, res, async err => {
      if (err) {
        return res.json(err);
      } else {
        const { type } = req.params;

        try {
          if (type == 'video' && VIDEO_EXT.indexOf(req.file.mimetype) !== -1) {
            const video = await Videos.create({
              videoOwnerId: req.params.id,
              videoFile: req.file.path,
              name: req.file.originalname,
              videoMeta: req.file
            });
            return res.json({
              video
            });
          } else if (
            type === 'image' &&
            IMAGE_EXT.indexOf(req.file.mimetype) !== -1
          ) {
            return res.json({
              res: req.file
            });
          } else if (
            type === 'audio' &&
            AUDIO_EXT.indexOf(req.file.mimetype) !== -1
          ) {
            const audio = await Audios.create({
              audioOwnerId: req.params.id,
              audioFile: req.file.path,
              name: req.file.originalname,
              audioMeta: req.file
            });
            return res.json({
              audio
            });
          } else {
            return res.json({
              err: 400,
              message: 'File not allowed'
            });
          }
        } catch (err) {
          return res.json(err);
        }
      }
    });
  };

  Action.remoteMethod('upload', {
    description: 'Upload a file',
    accepts: [
      { arg: 'req', type: 'object', http: { source: 'req' } },
      { arg: 'res', type: 'object', http: { source: 'res' } },
      {
        arg: 'id',
        type: 'string',
        required: true
      },
      {
        arg: 'type',
        type: 'string',
        required: true
      }
    ],
    returns: {
      arg: 'result',
      type: 'string'
    },
    http: { path: '/upload/:type/:id', verb: 'post' }
  });

  Action.genrateThumbnail = async id => {
    const Videos = app.models.Videos;

    try {
      let video = await Videos.findOne({
        where: { id }
      });

      try {
        const tg = new ThumbnailGenerator({
          sourcePath: video.videoMeta.path,
          thumbnailPath: video.videoMeta.destination,
          size: '200x200',
          count: 3
        });

        const thumb = await tg.generate();
        const thumbnails = thumb.map(x =>
          path.join(video.videoMeta.destination, x)
        );
        return { thumbnails };
      } catch (err) {
        return { err };
      }
    } catch (err) {
      return { err };
    }
  };

  Action.remoteMethod('genrateThumbnail', {
    description: 'Method to create video thumnails.',
    accepts: [
      {
        arg: 'id',
        type: 'string',
        required: true
      }
    ],
    returns: {
      type: 'object',
      root: true
    },
    http: {
      path: '/genrateThumbnail/:id',
      verb: 'get'
    }
  });

  Action.processVideo = async id => {
    const Videos = app.models.Videos;

    try {
      let video = await Videos.findOne({
        where: { id }
      });

      try {
        const tg = new ThumbnailGenerator({
          sourcePath: video.videoMeta.path,
          destinationPath: video.videoMeta.destination,
          size: '200x200',
          count: 3
        });

        const compressVideo = await tg.resizeVideo(720);
        return { compressVideo };
      } catch (err) {
        return { err };
      }
    } catch (err) {
      return { err };
    }
  };

  Action.remoteMethod('processVideo', {
    description: 'Method to process video and generate lower version.',
    accepts: [
      {
        arg: 'id',
        type: 'string',
        required: true
      }
    ],
    returns: {
      type: 'object',
      root: true
    },
    http: {
      path: '/processVideo/:id',
      verb: 'get'
    }
  });

  Action.getContent = async (id, limit) => {
    const Videos = app.models.Videos;
    const Audios = app.models.Audio;

    if (id) {
      const video = await Videos.find({
        fields: {
          videoOwnerId: true,
          id: true,
          name: true,
          videoFile: true,
          thumbImage: true
        },
        where: { videoOwnerId: id, visibility: 1 },
        limit: limit
      });
      const audio = await Audios.find({
        fields: {
          audioOwnerId: true,
          id: true,
          name: true,
          audioFile: true,
          thumbImage: true
        },
        where: { audioOwnerId: id, visibility: 1 },
        limit: limit
      });
      return { video, audio };
    } else {
      const video = await Videos.find({
        fields: { id: true, name: true, videoFile: true, thumbImage: true },
        where: { visibility: 1 },
        limit: limit / 2
      });
      const audio = await Audios.find({
        fields: { id: true, name: true, audioFile: true, thumbImage: true },
        where: { visibility: 1 },
        limit: limit / 2
      });
      return { video, audio };
    }
  };

  Action.remoteMethod('getContent', {
    description: 'Method to process video and generate lower version.',
    accepts: [
      {
        arg: 'id',
        type: 'string'
      },
      {
        arg: 'limit',
        type: 'string',
        required: true
      }
    ],
    returns: {
      type: 'object',
      root: true
    },
    http: {
      path: '/getContent/:limit/:id?',
      verb: 'get'
    }
  });
};
