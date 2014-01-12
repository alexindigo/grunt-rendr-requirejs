
# grunt-rendr-requirejs

Adopted grunt-rendr-stitch to use with RequireJS (work in progress).

> Use RequireJS to package up your modules for use with Rendr (github.com/airbnb/rendr).

## Getting Started
This plugin requires Grunt `~0.4.1`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-rendr-requirejs --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-rendr-requirejs');
```

## The "rendr_requirejs" task

### Overview
In your project's Gruntfile, add a section named `rendr_requirejs` to the data object passed into `grunt.initConfig()`.


```js
grunt.initConfig({
  rendr_requirejs: {
    options: {
      appDir: 'assets',
      mainConfigFile: 'assets/common.js',
      dir: 'public',
      node_modules:
      [
        {name: 'async', location: 'async/lib', main: 'async.js'}
      ],
      modules: [
        {
          name: '../common',
          include:
          [
            'jquery',
            'async',
            'shared/module',
            'app/controller/Base',
            'app/model/Base'
          ],
        },
        {
            name: '../bundle',
            include: ['app/app'],
            exclude: ['../common']
        },
        {
            name: '../other-bundle',
            include: ['../other/foo'],
            exclude: ['../common']
        }
      ]
    }
  }
});
```

We can then use RequireJS in the browser to require any of the source files.

```js
require(['app/views/user_show_view'], function(UserShowView)
{
  ...
});
```

Together with ```amdefine``` could be used for requiring modules in both Node.js and in the browser. For example:

```js
if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(['../base'], function(BaseView) {

});
```

### Options

#### options.node_modules
Type: `Object`
Default value: `{}`

An object containing a list of node modules to pass as `options.packages` to `requirejs.optimize()`.

`options.node_modules` is optional and can be omitted.

## Release History

### 0.1.0
Changed resolution of `node_modules` section, now it will check dependencies of the `rendr` module and if not found,
will travel up directory tree, same as standard dependency resolution.

### 0.0.1
grunt-rendr-stitch mangled into grunt-rendr-requirejs.
