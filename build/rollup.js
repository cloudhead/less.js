const rollup = require('rollup');
const babel = require('rollup-plugin-babel');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const terser = require('rollup-plugin-terser').terser;
const banner = require('./banner');
const path = require('path');

const rootPath = process.cwd();

const args = require('minimist')(process.argv.slice(2));

const babelConfig = {
    exclude: 'node_modules/**' // only transpile our source code
};

let outDir = args.dist ? './dist' : './tmp';

async function buildBrowser() {
    let bundle = await rollup.rollup({
        input: './lib/less-browser/bootstrap.js',
        output: [
            {
                file: 'less.js',
                format: 'umd'
            },
            {
                file: 'less.min.js',
                format: 'umd'
            }
        ],
        plugins: [
            resolve(),
            commonjs(),
            babel({
                ...babelConfig,
                presets: [["@babel/env", {
                    targets: '> 0.25%, not dead'
                }]]
            }),
            terser({
                include: [/^.+\.min\.js$/],
                output: {
                    comments: function(node, comment) {
                        if (comment.type == "comment2") {
                            // preserve banner
                            return /@license/i.test(comment.value);
                        }
                    }
                }
            })
        ]
    });

    if (!args.out || args.out.indexOf('less.js') > -1) {
        const file = args.out || `${outDir}/less.js`;
        console.log(`Writing ${file}...`);
        await bundle.write({
            file: path.join(rootPath, file),
            format: 'umd',
            name: 'less',
            banner
        }); 
    }

    if (!args.out || args.out.indexOf('less.min.js') > -1) {
        const file = args.out || `${outDir}/less.min.js`;
        console.log(`Writing ${file}...`);
        await bundle.write({
            file: path.join(rootPath, file),
            format: 'umd',
            name: 'less',
            sourcemap: true,
            banner
        });
    }
}

async function buildNode() {
    let bundle = await rollup.rollup({
        input: './lib/less-node/index.js',
        external(id) {
            return /^[^.]/.test(id)
        },
        plugins: [
            resolve(),
            commonjs(),
            babel({
                ...babelConfig,
                presets: [["@babel/env", {
                    targets: {
                        node: '6'
                    }
                }]]
            })
        ]
    });

    const file = args.out || './dist/less.cjs.js';
    console.log(`Writing ${file}...`);

    await bundle.write({
        file: path.join(rootPath, file),
        format: 'cjs',
        interop: false
    });
}

async function buildLessC() {
    let bundle = await rollup.rollup({
        input: './lib/lessc.js',
        external(id) {
            return /^[^.]/.test(id)
        },
        plugins: [
            resolve(),
            commonjs(),
            babel({
                ...babelConfig,
                presets: [["@babel/env", {
                    targets: {
                        node: '6'
                    }
                }]]
            })
        ]
    });

    const file = args.out || './bin/lessc'
    console.log(`Writing ${file}...`);

    await bundle.write({
        file: path.join(rootPath, file),
        banner: '#!/usr/bin/env node\n',
        format: 'cjs',
        interop: false
    });
}

async function build() {
    if (args.dist || args.lessc) {
        await buildLessC();
    }
    if (args.dist || args.browser) {
        await buildBrowser();
    }
    if (args.dist || args.node) {
        await buildNode();
    }
}
try {
    build();
}
catch (e) {
    throw e;
}