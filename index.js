var dotenv = require('dotenv');
dotenv.load();
var ipm2 = require('pm2-interface')();
var _ = require('lodash');
var moment = require('moment');
var async = require('async');

/**
 * Connect graphite
 */
var graphite = require('graphite');

var graphiteUrl = 'plaintext://' + process.env.GRAPHITE_HOST + ':'
                                 + process.env.GRAPHITE_PORT;
var client = graphite.createClient(graphiteUrl);

/**
 * Connect StatsD
 */
// var StatsD = require('node-statsd')
// var statsdClient = new StatsD({
//     host: process.env.STATSD_HOST || 'localhost',
//     port: process.env.STATSD_PORT || 8125,
//     prefix: process.env.STAT_PREFIX || '',
//     suffix: process.env.STAT_SUFFIX || ''
// });

var services = (process.env.SERVICES || '').split(',');

var STAT_MEM_USAGE = 'memory';
var STAT_CPU_USAGE = 'cpu'

ipm2.on('ready', function() {
    console.log('Connected to pm2');

    var interval = process.env.INTERVAL || 30000;

    setInterval(function() {
        ipm2.rpc.getMonitorData({}, function(err, data) {
            if (!err && data) {
                processPm2Data(data);
            }
        });
    }, interval);

    //ipm2.bus.on('*', function(event, data) {
    //      console.log('Event', event);
    //      console.log('Data', data);
    //});


});

function processPm2Data(data) {
    if (_.isArray(data)) {
        async.each(data, function(serviceInfo) {
            if (services.indexOf(serviceInfo.name) > -1) {
                var memoryInByte = serviceInfo.monit.memory;
                var memoryInMB = Math.round(100 * memoryInByte / (1024 * 1024)) / 100;

                var memoryStats = STAT_MEM_USAGE + '.' + serviceInfo.name;
                var memoryMetrics = { memoryStats: memoryInMB};
                client.write(memoryMetrics);

                var cpuStats = STAT_CPU_USAGE + '.' + serviceInfo.name;
                var cpuMetrics = { cpuStats: serviceInfo.monit.cpu };
                client.write(cpuMetrics);
            }
        });
    }
}
