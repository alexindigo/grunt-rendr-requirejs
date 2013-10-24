requirejs.config({
    baseUrl: 'lib',
    paths: {
        app: '../app',
        shared: '../some_module/shared'
    },
    shim: {
        backbone: {
            deps: ['jquery', 'underscore'],
            exports: 'Backbone'
        },
        underscore: {
            exports: '_'
        }
    }
});
