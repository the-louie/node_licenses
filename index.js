var async = require('asyncawait/async');
var await = require('asyncawait/await');
var fs = require('fs-extra-promise');
var path = require('path');
var _ = require('lodash');
var recursive = require('recursive-readdir');

function unique_components(component_licenses) {
    var unique_licenses = [];
    var tmp = {};
    component_licenses.forEach(function(component_license) {
        tmp[component_license.component + component_license.license] = component_license;
    });
    return _.values(tmp);
}

function unique_licenses(component_licenses) {
    var tmp = {};
    component_licenses.forEach(function(component_license) {
        if (tmp[component_license.license]===undefined) {
            tmp[component_license.license] = [];
        }
        tmp[component_license.license].push(component_license);
    });
    return tmp;
}


function packagejson(filepath) {
    try {
        var fs = require("fs"); //Load the filesystem module
        var stats = fs.statSync(filepath);
        if(stats.size === 0)
            return ;

        var json = require((filepath).replace('//','/'));
        if (json.license !== undefined) {
            switch(typeof (json.license)) {
                case "string":
                    return json.license;
                    // return {filepath: filepath, component: path.dirname(filepath).split('/').slice(-1)[0], license: json.license };
                case "object":
                    if (json.license.type !== undefined) { // object
                        return json.license.type;
                        // return {filepath: filepath, component: path.dirname(filepath).split('/').slice(-1)[0], license: json.license.type };
                    }
                    return;
                default:
                    return;

            }
        } else if (json.licenses !== undefined) {
            if (typeof (json.licenses) === 'string') {
                return json.licenses;
                // return {filepath: filepath, component: path.dirname(filepath).split('/').slice(-1)[0], license: json.licenses };
            } else if (json.licenses[0] !== undefined) { // list
                json.licenses.forEach(function(license) {
                    return license.type;
                    // return {filepath: filepath, component: path.dirname(filepath).split('/').slice(-1)[0], license: license.type };
                });
            }
        } else {
            return;
        }
    } catch (e) {
        console.log("Error when loading", filepath);
        console.log(e);
        return;
    }
}

function licensefile(component_path) {
    var filepath = path.join(component_path, 'LICENSE');
    return { filepath: filepath, component: component_path.split('/').slice(-1)[0], license: "textfile", licensetext: await(fs.readFileAsync(filepath, 'utf-8')) };
}

recursive(process.argv[2], function (err, files) {
    var components = [];
    files.forEach(function(filepath) {
        // If it has a package.json it's a node module.
        if (path.basename(filepath) == 'package.json')
            components.push(path.dirname(filepath));
        else if (path.basename(filepath) == 'LICENSE')
            components.push(path.dirname(filepath));
    });


    // files.forEach(function(filepath) {
    //     if (filepath.split('/').indexOf('test') != -1)
    //         return;

    //     if (path.basename(filepath) == "package.json") {
    //         // search package.json for a licence item
    //         component_licenses.push(packagejson(filepath));
    //     } else if (path.basename(filepath) == 'LICENSE') {
    //         // just get the text from the LICENSE file
    //         component_licenses.push(licensefile(filepath));
    //     }
    // });

    // console.log( unique_components(component_licenses) );
    // console.log("\n---\n");
    // console.log( Object.keys(unique_licenses(component_licenses)) );
    // console.log("\n---\n");
    // console.log( unique_licenses(component_licenses).Unknown );

    components.forEach(async.cps(function(component_path) {
        // check if the grandparent directory is node_modules
        if (path.dirname(component_path).split('/').slice(-1)[0] != 'node_modules')
            return;

        var license_info = {
            full_path: filepath,
            component_path: path.dirname(filepath).split('/').slice(-1)[0],
        };

        // We have a package JSON, lets see if we can get some licesing info from it.
        if (await(fs.existsAsync(path.join(component_path, 'package.json')))) {
            license_info.license = packagejson(path.join(component_path, 'package.json'));
        }

        // If we didn't get a license above let's check for a LICENSE file.
        if (!license_info.license && await(fs.existsAsync(path.join(component_path, 'LICENSE')))) {
            license_info.license = licensefile(component_path);
        }

        // If we still don't have any license it should be added as unknown for maunal review.
        if (!license_info.license) {
            license_info.license = false;
        }

        console.log(license_info);

        // fs.exists(path.join(component_path, 'package.json'), function(exists) {
        //     var p;
        //     var f;
        //     if(exists) {
        //         p = packagejson(path.join(component_path, 'package.json'));
        //     }

        //     if(!p) {
        //         fs.exists(path.join(component_path, 'LICENSE'), function(exists) {
        //             if (exists) {
        //                 f = licensefile(path.join(component_path, 'LICENSE'));
        //             }
        //         });

        //     }

        //     if (p && false)
        //         console.log(p);
        //     else if (f)
        //         console.log(f);
        // });
    }));

    console.log("");

    console.log("found",components.length,"components");
});

