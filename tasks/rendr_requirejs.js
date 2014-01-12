/*
 * grunt-rendr-requirejs
 *
 *
 * Copyright (c) 2013 Spike Brehm
 * Licensed under the MIT license.
 */

'use strict';

// To get reference to the Rendr module itself,
// we will require it as first child of the current module
// and get reference as the first element of the children array
var rendr       = require('rendr')
  , rendrModule = module.children[0]
  ;

// Proceed as normal
var path      = require('path')
  , requirejs = require('requirejs')
  , async     = require('async')
  , Module    = require('module')
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
      options.packages = (options.packages || []).concat(grunt.util._.map(options.node_modules, function(nodeModule)
      {
        var name, modulePath;

        // run standard module path resolver based of Rendr module
        if (modulePath = Module._resolveFilename(path.join(nodeModule.location, nodeModule.main), rendrModule))
        {
          nodeModule.location = path.dirname(modulePath);
          nodeModule.main     = path.basename(modulePath);

          if (!grunt.file.exists(nodeModule.location))
          {
            grunt.log.warn('Source file "' + nodeModule.location + '" not found.');
            return false;
          }

          // main exit
          return nodeModule;
        }
        else
        {
          grunt.log.warn('Unable to find node module path "' + nodeModule.location + '".');
          return false;
        }

      }));
    }

    grunt.verbose.writeflags(options, 'Options');

    requirejs.optimize(options, options.done.bind(null, done));
  });

};
