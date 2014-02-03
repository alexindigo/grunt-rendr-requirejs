/*
 * grunt-rendr-requirejs
 *
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
  , crypto    = require('crypto')
  , merge     = require('deeply')
  , requirejs = require('requirejs')
  , async     = require('async')
  , glob      = require('glob')
  , Module    = require('module')
  ;

module.exports = function(grunt) {

  // add grunt instance to the config update function
  updateConfigNode = updateConfigNode.bind(this, grunt);

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

    var i
      , outFile
      , moduleList
      , done = this.async()
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

    // handle hashing
    // TODO: Add support for hashing dir output
    // example:
    // {
    //   hashed: true, // append content hash suffix
    //   storeHash: 'config/runtime.json', // config file to store generated hash
    //   configPath: 'appData.static.js.common', // config path to the hash key
    //   storeMapping: 'config/runtime.json', // config file to store modules mapping
    //   storeMappingNode: 'appData.static.js._mapping', // config node to store modules mapping
    // }
    if (options.hashed && options.out)
    {
      outFile = path.resolve(process.cwd(), options.out);

      options.out = function outHashing(text)
      {
        var hash
          , filename
          , moduleMapping = {}
          , md5sum = crypto.createHash('md5')
          ;

        md5sum.update(text);
        hash = md5sum.digest('hex');

        // update filename
        outFile = outFile.replace(/\.js$/, '.'+hash+'.js');

        grunt.file.write(outFile, text);

        filename = path.basename(outFile);

        // update config
        // TODO: Only JSON for now
        if (options.storeHash && options.storeHashNode)
        {
          // store generated filename in the config file
          updateConfigNode(options.storeHash, options.storeHashNode, filename);
        }

        // store module mapping
        if (options.storeMapping && moduleList)
        {
          // strip extension for requirejs
          moduleMapping[path.basename(filename, '.js')] = moduleList;

          // store generated filename in the config file
          updateConfigNode(options.storeMapping, options.storeMappingNode, moduleMapping);
        }
      }
    }

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

    // hack for loading modules without dependencies
    // Idea is to create exclude with same module, but different path,
    // so module itself will be included in the build, but not it's dependencies
    // TODO: Support single output file, only `modules` for now
    // TODO: For now assume for shallow modules there is no manual `exclude` option
    // TODO: Dry it up
    if (options.shallow && options.modules)
    {
      for (i=0; i<options.modules.length; i++)
      {
        // support simple format – just modules name, convert into proper object
        if (typeof options.modules[i] == 'string')
        {
          options.modules[i] = {name: options.modules[i]};
        }
        options.modules[i].exclude = [ options.modules[i].name.replace(/([^\/]+)\/([^\/]+)$/, '$1/../$1/$2') ];
      }
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
        }
        else
        {
          expandedInclude.push(filePath);
          cb();
        }

      }, function(err)
      {
        var i, j
          , pathParts
          , content
          , matches
          , deps
          ;

        // update include with expanded list
        options.include = expandedInclude;

        // store modules list for mapping
        moduleList = options.include;

        // in case of include only hardcore options left
        // get the file, find all the `require` and add them to `paths` mapping as "empty" module
        // TODO: Make it sane
        if (options.shallow)
        {
          options.excludeShallow = [];

          for (i=0; i<options.include.length; i++)
          {
            // resolve real filename and fetch content
            pathParts = getModulePaths(options.include[i], options);
            content = grunt.file.read(path.resolve(pathParts.cwd, (pathParts.real && pathParts.real + '/') + pathParts.mean + '.js' ));

            // get list of dependencies
            deps = findDependencies(content);

            // generate global deps list
            // and exclude included modules from the exclude list :)
            // yes, I know :)
            for (j=0; j<deps.length; j++)
            {
              if (options.include.indexOf(deps[j]) == -1 && !options.paths.hasOwnProperty(deps[j]))
              {
                options.paths[deps[j]] = 'empty:';
              }
            }
          }
        }

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

function findDependencies(content)
{
  var i
    , m
    , matches
    , list = {} // keep it as object to keep deps unique
    ;

  // look for proper AMD style `define([...])`
  if (matches = content.match(/define\s*\([\S\s]*?\{/g))
  {
    while (m = matches.shift())
    {
      if ((m = m.match(/\[([\S\s]*?)\]/g))
        && (m = m[0].match(/('|")([^'"]+?)('|")/g))
        )
      {
        // remove quotes and add to the list
        for (i=0; i<m.length; i++)
        {
          list[m[i].replace(/^('|")|('|")$/g, '')] = true;
        }
      }
    }
  }

  // look for require statements
  if (matches = content.match(/require\s*\([^\)]+?\)/g))
  {
    while (m = matches.shift())
    {
      // check for AMD style require
      if (m.indexOf('[') > -1)
      {
        if ((m = m.match(/\[([\S\s]*?)\]/g))
          && (m = m[0].match(/('|")([^'"]+?)('|")/g))
          )
        {
          // remove quotes and add to the list
          for (i=0; i<m.length; i++)
          {
            list[m[i].replace(/^('|")|('|")$/g, '')] = true;
          }
        }
      }
      else if (m = m.match(/\((?:'|")([^'")]+)(?:'|")\)/)) // check for CommonJS style require
      {
        list[m[1]] = true;
      }
    }
  }

  // return simple list
  return Object.keys(list);
}

function getModulePaths(module, options)
{
  var name      = ''
    , names     = module.split('/')
    , map       = options.paths
    , basePath  = options.appDir || options.baseUrl || ''
    , pathParts =
      { base: '' // "virtual" part of the path, resolved using map
      , mean: '' // "keeper" part of the path
      , real: '' // "base" part of the path after map resolution
      , cwd : path.resolve(process.cwd(), basePath) // find work directory
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

  return pathParts;
}

/**
 * Unfolds files patterns into list of files
 * with respect to options.[baseUrl, paths]
 * returns list of files relative to provided pattern base
 *
 * 'app/** /*.js' -> ['app/app.js', 'app/collections/base.js', 'app/models/carta.js', ...]
 */
function unfoldPath(oPath, options, callback)
{
  var pathParts = getModulePaths(oPath, options);

  // get files from the location
  glob((pathParts.real && pathParts.real + '/') + pathParts.mean, {cwd: pathParts.cwd}, function(err, files)
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


/**
 * Updates specified node in config file with provided value
 * `node` parameter is dot-separated path to the config node
 */
 function updateConfigNode(grunt, filename, node, value)
 {
    var nodes
      , configKey
      , configData
      , key
      ;

    // prepare config nodes
    nodes = node.split('.');

    // get config data
    configKey = configData = grunt.file.readJSON(filename);

    // update config
    while (key = nodes.shift())
    {
      // create necessary sublevels
      if (!configKey.hasOwnProperty(key))
      {
        configKey[key] = {};
      }

      // shift reference
      if (nodes.length)
      {
        configKey = configKey[key];
      }
      // or assign hash if it's leaf-node
      else
      {
        if (typeof value == 'object')
        {
          configKey[key] = merge(configKey[key], value);
        }
        else
        {
          configKey[key] = value;
        }
      }
    }

    // store data back to disk
    grunt.file.write(filename, JSON.stringify(configData));
 }
