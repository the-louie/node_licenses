var async = require('asyncawait/async');
var await = require('asyncawait/await');
var fs = require('fs-extra-promise');
var path = require('path');
var _ = require('lodash');
var recursive = require('recursive-readdir');

function __grandParentDir(dir) {
    return path.dirname(dir).split('/').slice(-2)[0];
}

function packagejson(component_path) {
    var pkgfile;
    var package_info = {};

    try {
        pkgfile = require(path.join(component_path, 'package.json'));
    } catch (e) {
        console.log("ERROR when reading package.json from", component_path, ".", e);
        return;
    }

    package_info.name = pkgfile.name;
    package_info.version = pkgfile.version;
    package_info._requiredBy = pkgfile._requiredBy;
    package_info.version = pkgfile.version;
    package_info.licensetext = undefined;
    package_info.license = undefined;

    // parse the package.json to find license information
    if (pkgfile.license !== undefined) {
        if (typeof(pkgfile.license) == 'string')
            package_info.license = pkgfile.license;
        else if (typeof(pkgfile.license) == 'object')
            if (pkgfile.license[0] === undefined && pkgfile.license.type !== undefined)
                package_info.license = pkgfile.license.type;

    } else if (pkgfile.licenses !== undefined && typeof(pkgfile.licenses) == 'object') {
        if (pkgfile.licenses[0] !== undefined) {

            if (pkgfile.licenses[0].type !== undefined)
                package_info.license = pkgfile.licenses[0].type;
            else if (typeof(pkgfile.licenses[0]) == 'string')
                package_info.license = pkgfile.licenses[0];
        }

    }

    return package_info;
}

function parse_license_text(text) {
    if (text.match(/\sMIT[^a-z]?/i) !== null ||
        text.match(/Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files \(the "Software"\), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and\/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software./i)) {
        return "MIT";
    }

    if (text.match(/Apache License.? Version 2.0/i) !== null) {
        return "Apache 2.0";
    }

    if (text.match(/ISC License/i) !== null) {
        return "ISC";
    }

    if (text.match(/BSD License/i) !== null) {
        return "BSD";
    }

    return "UNKNOWN";
}


function licenseFile(component_path) {
    // Find the first file matching /licen[sc]e/i
    var lf = fs.readdirSync(component_path);
    var licence = lf.filter(function(fileName) {
        return (fileName.match(/licen[sc]e/i) !== null);
    })[0]; // We accually only care about one file, the first.

    if (licence === undefined) {
        var rm = fs.readdirSync(component_path);
        licence = rm.filter(function(fileName) {
            return (fileName.match(/readme/i) !== null);
        })[0]; // We accually only care about one file, the first.
    }

    if (licence !== undefined) {
        var licenseText = fs.readFileSync(path.join(component_path, licence), 'utf-8');
        licenseText = licenseText.replace(/\n/g, ' ');
        licenseText = licenseText.replace(/ +/g, ' ');
        var license = parse_license_text(licenseText);
        return {
            license: license,
            licensetext: licenseText,
        };
    } else {
        return { license: "UNKNOWN" };
    }
}

function reduce_license(license_string) {
    if (license_string.match(/[^a-z]?bsd[^a-z]?/i) !== null)
        return "BSD";

    if (license_string.match(/[^a-z]?bsd[^a-z]?2-clause/i) !== null)
        return "BSD-2-Clause";

    if (license_string.match(/[^a-z]?bsd[^a-z]?3-clause/i) !== null)
        return "BSD-3-Clause";

    if (license_string.match(/[^a-z]?isc[^a-z]?/i) !== null)
        return "ISC";

    if (license_string.match(/[^a-z]?mit[^a-z]?/i) !== null)
        return "MIT";

    if (license_string.match(/[^a-z]?apache[^a-z]?2\.0/i) !== null)
        return "Apache 2.0";

    if (license_string.match(/[^a-z]?public ?domain[^a-z]?/i) !== null)
        return "Public Domain";

    if (license_string.match(/[^a-z]?gplv2[^a-z]?/i) !== null)
        return "GPLv2";

    if (license_string.match(/[^a-z]?gplv3[^a-z]?/i) !== null)
        return "GPLv3";


    return license_string;

}

recursive(process.argv[2], function (err, files) {
    var component_paths = [];
    var components = {};

    files.forEach(async.cps(function(filepath) {
        // If it has a package.json and the parent is node_modules
        // then we treat it as a node module.
        if (path.basename(filepath) == 'package.json' && __grandParentDir(filepath) == 'node_modules') {
            if (path.dirname(filepath).match(/node_modules\/resolve\/test/i) !== null) {
                return;
            }

            var info = packagejson(path.dirname(filepath));
            if (info === undefined)
                return console.log("ERR", path.dirname(filepath));

            // If we didn't find any license information in package.json we should
            // look for a LICENSE file (or worst case a README).
            if (info.license === undefined)
                info = _.extend(info, licenseFile(path.dirname(filepath)));

            info.path = filepath;

            components[info.name] = info;
        }
    }));


    var licenses = {};
    var ai_licenses = {};
    Object.keys(components).forEach(function(componentName) {
        var license = components[componentName].license;
        var ai_license = reduce_license(license);
        if(ai_license === 'GPLv2')
            console.log(components[componentName]);

        if (licenses[license] === undefined)
            licenses[license] = { componentNames: [] };

        if (ai_licenses[ai_license] === undefined)
            ai_licenses[ai_license] = { componentNames: [] };

        licenses[license].componentNames.push(components[componentName]);
        ai_licenses[ai_license].componentNames.push(components[componentName]);
    });


    console.log(JSON.stringify(Object.keys(licenses), null, 2));
    console.log(JSON.stringify(Object.keys(ai_licenses), null, 2));

    var columns = ["name", "version", "_requiredBy", "version", "licensetext", "license"];
    var csvlist = [];
    csvlist.push(columns);


    Object.keys(ai_licenses).forEach(function(key) {
        var l = ai_licenses[key].componentNames;

        l.forEach(function(m) {
            columns.forEach(function(col) {
                var r = [];
                r.push(m[col]);
                csvlist.push(r);
            });
        });
    });


    csvlist.forEach(function(row) {
        console.log(row);
    });


    // ['UNKNOWN', 'GPLv2'].forEach(function(l) {
    //     console.log("");
    //     console.log("--",l);

    //     Object.keys(ai_licenses[l].componentNames).forEach(function(a) {
    //         var c = ai_licenses[l].componentNames[a];
    //         console.log(c.name || c.path, c._requiredBy);
    //         console.log("--");
    //     });

    // });

    console.log("");
    console.log("found",Object.keys(components).length,"components");
    console.log("found",Object.keys(ai_licenses).length,"computed licenses (of",Object.keys(licenses).length,"unique license strings)");
});

