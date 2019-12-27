const FfmpegCommand = require('fluent-ffmpeg');
const spawn = require('child_process').spawn;
const path = require('path');
const fs = require('fs-extra');
const Promise = require('bluebird');
const _ = require('lodash');
const del = require('del');

/**
 * @class ThumbnailGenerator
 */
module.exports = class ThumbnailGenerator {
  /**
   * @constructor
   *
   * @param {String} [opts.sourcePath] - 'full path to video file'
   * @param {String} [opts.destinationPath] - 'path to where thumbnail(s) should be saved'
   * @param {Number} [opts.percent]
   * @param {String} [opts.size]
   * @param {Logger} [opts.logger]
   */
  constructor(opts) {
    this.sourcePath = opts.sourcePath;
    this.count = opts.count || 3;
    this.destinationPath = opts.destinationPath;
    this.percent = `${opts.percent}%` || '90%';
    this.logger = opts.logger || null;
    this.size = opts.size || '320x240';
    this.fileNameFormat = 'thumbnail-%r-%000i';
    this.tmpDir = opts.tmpDir || '/tmp';

    // by include deps here, it is easier to mock them out
    this.FfmpegCommand = FfmpegCommand;
    this.del = del;
  }

  /**
   * @method getFfmpegInstance
   *
   * @return {FfmpegCommand}
   *
   * @private
   */
  getFfmpegInstance() {
    return new this.FfmpegCommand({
      source: this.sourcePath,
      logger: this.logger
    });
  }

  /**
   * Method to generate one thumbnail by being given a time value.
   *
   * @method generateOneByTime
   *
   * @param {String} time
   * @param {String} [opts.folder]
   * @param {String} [opts.size] - 'i.e. 320x320'
   * @param {String} [opts.filename]
   *
   * @return {Promise}
   *
   * @public
   *
   * @async
   */
  generateOneByTime(time, opts) {
    return this.generate(
      _.assignIn(opts, {
        count: 1,
        timestamps: [`${time}`]
      })
    ).then(result => result.pop());
  }

  /**
   * Method to generate one thumbnail by being given a time value.
   *
   * @method generateOneByTimeCb
   *
   * @param {String} time
   * @param {Object} [opts]
   * @param {Function} cb (err, string)
   *
   * @return {Void}
   *
   * @public
   *
   * @async
   */
  generateOneByTimeCb(time, opts, cb) {
    const callback = cb || opts;

    this.generateOneByTime(time, opts)
      .then(result => callback(null, result))
      .catch(callback);
  }

  /**
   * Method to generate one thumbnail by being given a percentage value.
   *
   * @method generateOneByPercent
   *
   * @param {Number} percent
   * @param {String} [opts.folder]
   * @param {String} [opts.size] - 'i.e. 320x320'
   * @param {String} [opts.filename]
   *
   * @return {Promise}
   *
   * @public
   *
   * @async
   */
  generateOneByPercent(percent, opts) {
    if (percent < 0 || percent > 100) {
      return Promise.reject(new Error('Percent must be a value from 0-100'));
    }

    return this.generate(
      _.assignIn(opts, {
        count: 1,
        timestamps: [`${percent}%`]
      })
    ).then(result => result.pop());
  }

  /**
   * Method to generate one thumbnail by being given a percentage value.
   *
   * @method generateOneByPercentCb
   *
   * @param {Number} percent
   * @param {Object} [opts]
   * @param {Function} cb (err, string)
   *
   * @return {Void}
   *
   * @public
   *
   * @async
   */
  generateOneByPercentCb(percent, opts, cb) {
    const callback = cb || opts;

    this.generateOneByPercent(percent, opts)
      .then(result => callback(null, result))
      .catch(callback);
  }

  /**
   * Method to generate thumbnails
   *
   * @method generate
   *
   * @param {String} [opts.folder]
   * @param {Number} [opts.count]
   * @param {String} [opts.size] - 'i.e. 320x320'
   * @param {String} [opts.filename]
   *
   * @return {Promise}
   *
   * @public
   *
   * @async
   */
  generate(opts) {
    const defaultSettings = {
      folder: this.destinationPath,
      count: this.count,
      size: this.size,
      filename: this.fileNameFormat,
      logger: this.logger
    };

    const ffmpeg = this.getFfmpegInstance();
    const settings = _.assignIn(defaultSettings, opts);
    let filenameArray = [];

    return new Promise((resolve, reject) => {
      function complete() {
        resolve(filenameArray);
      }

      function filenames(fns) {
        filenameArray = fns;
      }

      ffmpeg
        .on('filenames', filenames)
        .on('end', complete)
        .on('error', reject)
        .screenshots(settings);
    });
  }

  /**
   * Method to generate thumbnails
   *
   * @method generateCb
   *
   * @param {String} [opts.folder]
   * @param {Number} [opts.count]
   * @param {String} [opts.size] - 'i.e. 320x320'
   * @param {String} [opts.filename]
   * @param {Function} cb - (err, array)
   *
   * @return {Void}
   *
   * @public
   *
   * @async
   */
  generateCb(opts, cb) {
    const callback = cb || opts;

    this.generate(opts)
      .then(result => callback(null, result))
      .catch(callback);
  }

  /**
   * Method to generate the palette from a video (required for creating gifs)
   *
   * @method generatePalette
   *
   * @param {string} [opts.videoFilters]
   * @param {string} [opts.offset]
   * @param {string} [opts.duration]
   * @param {string} [opts.videoFilters]
   *
   * @return {Promise}
   *
   * @public
   */
  generatePalette(opts) {
    const ffmpeg = this.getFfmpegInstance();
    const defaultOpts = {
      videoFilters: 'fps=60,scale=720:-1:flags=lanczos,palettegen'
    };
    const conf = _.assignIn(defaultOpts, opts);
    const inputOptions = ['-y'];
    const outputOptions = [`-vf ${conf.videoFilters}`];
    const output = `${this.tmpDir}/palette-${Date.now()}.png`;

    return new Promise((resolve, reject) => {
      function complete() {
        resolve(output);
      }

      if (conf.offset) {
        inputOptions.push(`-ss ${conf.offset}`);
      }

      if (conf.duration) {
        inputOptions.push(`-t ${conf.duration}`);
      }

      ffmpeg
        .inputOptions(inputOptions)
        .outputOptions(outputOptions)
        .on('end', complete)
        .on('error', reject)
        .output(output)
        .run();
    });
  }
  /**
   * Method to generate the palette from a video (required for creating gifs)
   *
   * @method generatePaletteCb
   *
   * @param {string} [opts.videoFilters]
   * @param {string} [opts.offset]
   * @param {string} [opts.duration]
   * @param {string} [opts.videoFilters]
   * @param {Function} cb - (err, array)
   *
   * @return {Promise}
   *
   * @public
   */
  generatePaletteCb(opts, cb) {
    const callback = cb || opts;

    this.generatePalette(opts)
      .then(result => callback(null, result))
      .catch(callback);
  }

  /**
   * Method to create a short gif thumbnail from an mp4 video
   *
   * @method generateGif
   *
   * @param {Number} opts.fps
   * @param {Number} opts.scale
   * @param {Number} opts.speedMultiple
   * @param {Boolean} opts.deletePalette
   *
   * @return {Promise}
   *
   * @public
   */
  generateGif(opts) {
    const ffmpeg = this.getFfmpegInstance();
    const defaultOpts = {
      fps: 0.75,
      scale: 180,
      speedMultiplier: 4,
      deletePalette: true,
      duration: 5,
      offset: 10
    };
    const conf = _.assignIn(defaultOpts, opts);
    const inputOptions = [];
    const outputOptions = [
      `-filter_complex fps=${conf.fps},setpts=(1/${conf.speedMultiplier})*PTS,scale=${conf.scale}:-1:flags=lanczos[x];[x][1:v]paletteuse`
    ];
    const outputFileName = conf.fileName || `video-${Date.now()}.gif`;
    const output = `${this.destinationPath}/${outputFileName}`;
    const d = this.del;

    function createGif(paletteFilePath) {
      if (conf.offset) {
        inputOptions.push(`-ss ${conf.offset}`);
      }

      if (conf.duration) {
        inputOptions.push(`-t ${conf.duration}`);
      }

      return new Promise((resolve, reject) => {
        outputOptions.unshift(`-i ${paletteFilePath}`);

        function complete() {
          if (conf.deletePalette === true) {
            d.sync([paletteFilePath], {
              force: true
            });
          }
          resolve(output);
        }

        ffmpeg
          .inputOptions(inputOptions)
          .outputOptions(outputOptions)
          .on('end', complete)
          .on('error', reject)
          .output(output)
          .run();
      });
    }

    return this.generatePalette().then(createGif);
  }

  /**
   * Method to create a short gif thumbnail from an mp4 video
   *
   * @method generateGifCb
   *
   * @param {Number} opts.fps
   * @param {Number} opts.scale
   * @param {Number} opts.speedMultiple
   * @param {Boolean} opts.deletePalette
   * @param {Function} cb - (err, array)
   *
   * @public
   */
  generateGifCb(opts, cb) {
    const callback = cb || opts;

    this.generateGif(opts)
      .then(result => callback(null, result))
      .catch(callback);
  }

  /**
   * Method to create a short gif thumbnail from an mp4 video
   *
   * @method resizeVideo
   *
   * @param {Number} video
   * @param {Number} outputdir
   * @param {Number} quality
   *
   * @public
   */
  resizeVideo(quality) {
    const video = this.sourcePath;
    const outputdir = this.destinationPath;

    if (!video || !outputdir) {
      return false;
    }

    const output = outputdir || this.tmpDir;
    const videoName = path.basename(video);

    if (!fs.existsSync(`${output}/transcoded`)) {
      fs.mkdirSync(`${output}/transcoded`);
    }

    return new Promise(resolve => {
      const ffmpeg = spawn('ffmpeg', [
        '-i',
        video,
        '-codec:v',
        'libx264',
        '-profile:v',
        'main',
        '-preset',
        'slow',
        '-b:v',
        '400k',
        '-maxrate',
        '400k',
        '-bufsize',
        '800k',
        '-vf',
        `scale=-2:${quality}`,
        '-threads',
        '0',
        '-b:a',
        '128k',
        `${output}/transcoded/${quality}_${videoName}`
      ]);
      ffmpeg.stderr.on('data', data => {
        console.log(`${data}`);
      });
      ffmpeg.on('close', () => {
        resolve(`${output}/transcoded/${quality}_${videoName}`);
      });
    });
  }
};
