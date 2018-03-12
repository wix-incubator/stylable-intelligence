import webpack = require("webpack");
import MemoryFS = require("memory-fs");
import * as path from "path";

const pkgDir = require('pkg-dir');

describe('browser-compatible', () => {
    it('browser-compatible', async function () {
        this.timeout(50000);
        const memoryFS = new MemoryFS();
        const rootPath = await pkgDir(__dirname);

        const compiler = webpack({
            mode: 'development',
            entry: {
                main: path.join(rootPath, 'service.js')
            },
            node: {
                path: 'empty', // users should provide alias to path-webpack
                net: 'empty',
                fs: 'empty',
                module: 'empty'
            }
        });

        compiler.outputFileSystem = memoryFS;

        await new Promise((res, rej)=> compiler.run((err, stats) => {
            if (err || stats.hasErrors()) {
                rej(err || new Error(stats.toString()));
            } else {
                res();
            }
        }));

    });
});