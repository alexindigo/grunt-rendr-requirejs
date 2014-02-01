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
  , glob      = require('glob')
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

    var done = this.async()
      , options = this.options(
        {
          logLevel: 0,
          done: function(done, response)
          {
            grunt.verbose.write(response);
            done();
          }
        })
      , expandedInclude = []
      ;

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

    // process include
    if (options.include)
    {
      async.map(options.include, function(filePath, cb)
      {
        if (filePath.indexOf('*') > -1)
        {
          // unfold path
          unfoldPath(filePath, options, function(err, files)
          {
            if (err) throw new Error(err);

            expandedInclude = expandedInclude.concat(files);
            cb();
          });
          // // find mapping
          // filePath = findMapping(options.paths, filePath);

          // expandedInclude = expandedInclude.concat( glob.sync(filePath, {cwd: path.resolve(process.cwd(), options.baseUrl || '')}) );
        }
        else
        {
          expandedInclude.push(filePath);
          cb();
        }

      }, function(err)
      {
        // update include with expanded list
        options.include = expandedInclude;

        // TODO: DRY it up
        grunt.verbose.writeflags(options, 'Options');
        requirejs.optimize(options, options.done.bind(null, done));
      });
    }
    else
    {
      // TODO: DRY it up
      grunt.verbose.writeflags(options, 'Options');
      requirejs.optimize(options, options.done.bind(null, done));
    }

  });

};

/**
 * Unfolds files patterns into list of files
 * with respect to options.[baseUrl, paths]
 * returns list of files relative to provided pattern base
 *
 * 'app/** /*.js' -> ['app/app.js', 'app/collections/base.js', 'app/models/carta.js', ...]
 */
function unfoldPath(oPath, options, callback)
{
  var name      = ''
    , names     = oPath.split('/')
    , map       = options.paths
    , basePath  = options.appDir || options.baseUrl || ''
    , pathParts =
      { base: '' // "virtual" part of the path, resolved using map
      , mean: '' // "keeper" part of the path
      , real: '' // "base" part of the path after map resolution
      }
    ;

  // looks for the matching mapping
  // if nothing found
  // chops off last part of the path
  // and looks again
  // 1. a/b/c/d -> a/b/c + d
  // 2. a/b/c -> a/b + c/d
  // 3. a/b -> a + /b/c/d
  // 4. a ->  + a/b/c/d
  do
  {
    // store leftovers to use with mapping
    pathParts.mean = name + (pathParts.mean && '/' + pathParts.mean);

    pathParts.base = names.join('/');

    if (map.hasOwnProperty(pathParts.base))
    {
      pathParts.real = map[pathParts.base];
      break;
    }
  }
  while (name = names.pop());

  // get files from the location
  glob((pathParts.real && pathParts.real + '/') + pathParts.mean, {cwd: path.resolve(process.cwd(), basePath)}, function(err, files)
  {
    var i, realPattern = new RegExp('^' + pathParts.real.replace(/(\.|\/)/g, '\\$1'));

    // replace real part with "virtual" base
    // to keep paths on the same page
    // and requirejs doesn't like file extensions
    // so remove them as well
    // TODO: Add support for other extensions than `js`
    for (i=0; i<files.length; i++)
    {
      files[i] = files[i].replace(realPattern, pathParts.base).replace(/\.js$/, '');
    }

    callback(null, files);
  });

}
