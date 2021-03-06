const chokidar = require('chokidar');
const EventEmitter = require('events').EventEmitter;
const fsExtra = require('fs-extra');

class Observer extends EventEmitter {
  constructor() {
    super();
  }

  watchFolder(folder, array) {
    try {
      console.log(
        `[${new Date().toLocaleString()}] Watching for folder changes on: ${folder}`
      );

      var watcher = chokidar.watch(folder, { persistent: true });

      watcher.on('add', async filePath => {
        console.log(
          `[${new Date().toLocaleString()}] ${filePath} has been added.`
        );

        // Read content of new file
        var fileContent = await fsExtra.readFile(filePath);
        // emit an event when new file has been added
        this.emit('file-added', {
          content: fileContent.toString('base64')
        });

        // remove file error.log
        await fsExtra.unlink(filePath);
        console.log(
          `[${new Date().toLocaleString()}] ${filePath} has been removed.`
        );

      });
    } catch (error) {
      console.log(error);
    }
  }
}

module.exports = Observer;