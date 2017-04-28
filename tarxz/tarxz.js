module.exports = function(RED) {
  const fs = require('fs');
  const tar = require('tar-fs');
  const xz = require('xz');
  const path = require('path');
  var node;

  function handleError(error) {
    node.error(error);
    node.status({fill:'red', shape:'ring', text:'Error'});
  }

  function decompress(filename) {
    const p = path.parse(filename);

    var d = require('domain').create();
    d.on('error', function(e){handleError(e)});
    d.run(function() {
      tar.pack(filename)
      .pipe(new xz.Compressor())
      .pipe(fs.createWriteStream(p.dir + '/' + p.name + '.tar.xz'));
    })
  }

  function decompress(filename) {
    const outFile = path.dirname(filename);

    var d = require('domain').create();
    d.on('error', function(e){handleError(e)});
    d.run(function() {
      fs.createReadStream(filename)
      .pipe(new xz.Decompressor())
      .pipe(tar.extract(outFile));
    })
  }

  function TarXZNode(n) {
    RED.nodes.createNode(this, n);
    this.filename = n.filename;
    node = this;

    this.on('input', function(msg) {
      const filename = node.filename || msg.filename || '';

      if (!node.filename) {
        node.status({fill:'grey', shape:'dot', text:filename});
      }

      if (filename === '') {
        node.warn('No filename specified');
      } else if (fs.existsSync(filename)) {
        if (fs.lstatSync(filename).isFile()) {
          var p = path.parse(filename); // {root, dir, base, ext, name}
          if (p.ext === '.xz') {
            if (path.extname(p.name) === '.tar') {
              decompress(filename);
            } else {
              node.error('Invalid file format (not tar)');
            }
          } else {
            compress(filename);
          }
        } else if (fs.lstatSync(filename).isDirectory()) {
          compress(filename);
        } else {
          node.error('Filename not a file or directory');
        }
      } else {
        node.error('No such file or directory');
      }

      msg.filename = filename;
      node.send(msg);
    });
  }
  RED.nodes.registerType('tar.xz', TarXZNode);
}
