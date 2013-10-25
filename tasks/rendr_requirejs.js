/*
 * grunt-rendr-requirejs
 *
 *
 * Copyright (c) 2013 Spike Brehm
 * Licensed under the MIT license.
 */

'use strict';

var path      = require('path')
  , requirejs = require('requirejs')
  , async     = require('async')
  ;

module.exports = function(grunt) {

  requirejs.define('node/print', [], function() {
    return function print(msg) {
      if (msg.substring(0, 5) === 'Error') {
        grunt.log.errorlns(msg);
        grunt.fail.warn('RequireJS failed.');
      } else {
        grunt.log.oklns(msg);
      }
    };
  });

  grunt.registerMultiTask('rendr_requirejs', 'Build a RequireJS project.', function() {

    var done = this.async();
    var options = this.options({
      logLevel: 0,
      done: function(done, response){
        grunt.verbose.write(response);
        done();
      }
    });

    // process node_modules
    if (options.node_modules)
    {
      options.packages = (options.packages || []).concat(grunt.util._.map(options.node_modules, function(module)
      {
        var name, modulePath;

        // go thru path modification to get node_modules path prefix
        if (modulePath = require.resolve(path.join(module.location, module.main)))
        {
          module.location = path.dirname(modulePath);
          module.main     = path.basename(modulePath);

          if (!grunt.file.exists(module.location))
          {
            grunt.log.warn('Source file "' + module.location + '" not found.');
            return false;
          }

          // main exit
          return module;
        }
        else
        {
          grunt.log.warn('Unable to find node module path "' + module.location + '".');
          return false;
        }

      }));
    }

    grunt.verbose.writeflags(options, 'Options');

    requirejs.optimize(options, options.done.bind(null, done));
  });



};
