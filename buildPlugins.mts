import filepath from 'path';
import esbuild from 'esbuild';
import fs from 'fs';
import child_process from 'child_process';
import { options } from './argIntake.mjs';

let flags: Record<string, boolean> = {
	ONCE: !options.watch,
	WATCH: options.watch,
	MINIFY: options.minify
};

let flagString = Object.entries(flags)
	.map(([flag, condition]) => condition && flag)
	.filter(Boolean)
	.reduce((prev, cur, i) => {
		if (i === 0) return cur;
		else return prev + ', ' + cur;
	});

/**
 * Create a new logging plugin for esbuild
 * @param {string} name Name to use in logging
 * @returns {esbuild.Plugin} esbuild plugin
 */
let loggingPlugin = (name: string): esbuild.Plugin => ({
	name: 'build-time-logging',
	setup(build) {
		let fileTimes: Record<string, { started?: Date; }> = {};
		build.initialOptions.metafile = true;
		build.onLoad({ filter: /.*/ }, ({ path }) => {
			path = "./" + filepath.relative(".", path).replaceAll("\\", "/");
			fileTimes[path] ??= {};
			fileTimes[path].started = new Date();
			return undefined;
		});

		build.onEnd(result => {
			let now = new Date();
			let currentTimeString = now.toLocaleTimeString('en', { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) + "." + ("000" + now.valueOf() % 1000).slice(-3);

			if (result.errors.length > 0 && result.warnings.length > 0) {
				console.log(`[ ${flagString} ] ${currentTimeString} ${name} build failed with \u001b[91m${result.errors.length} error(s)\u001b[39m and \u001b[93m${result.warnings.length} warning(s)\u001b[39m`);
				return;
			} else if (result.errors.length > 0) {
				console.log(`[ ${flagString} ] ${currentTimeString} ${name} build failed with \u001b[91m${result.errors.length} error(s)\u001b[39m`);
				return;
			} else if (result.warnings.length > 0) {
				console.log(`[ ${flagString} ] ${currentTimeString} ${name} build \u001b[92mfinished\u001b[39m with \u001b[93m${result.warnings.length} warning(s)\u001b[39m `);
				return;
			}

			let completedFiles = Object.keys(result!.metafile!.inputs)
				.map(path => "./" + filepath.relative('.', path).replaceAll("\\", "/"));

			completedFiles.forEach(path => {
				let timeString = `${now.valueOf() - fileTimes[path].started!.valueOf()}ms`;
				console.log(`[ ${flagString} ] ${currentTimeString} ${name} build \u001b[92mfinished\u001b[39m in ${timeString}: ${path}`);
			});
		});
	}
});

/**
 * Create a new type checking plugin for esbuild
 * @param {string} name Name to use in logging
 * @returns {esbuild.Plugin} esbuild plugin
 */
let typecheckPlugin = (name: string): esbuild.Plugin => ({
	name: 'supibot-typescript-typecheck',
	setup(build) {
		build.onResolve({ filter: /\.ts$/ }, async (args) => {
			if (options["skip-type-check"]) {
				let now = new Date();
				let currentTimeString = now.toLocaleTimeString('en', { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) + "." + ("000" + now.valueOf() % 1000).slice(-3);
				console.log(`[ ${flagString} ] ${currentTimeString} ${name} type check \u001b[33mskipped\u001b[39m`);
				return;
			}

			let fileTimes: Record<string, { started?: Date; }> = {};
			let now = new Date();
			let path = "./" + filepath.relative(".", args.path).replaceAll("\\", "/");
			fileTimes[path] ??= {};
			fileTimes[path].started = now;
			let currentTimeString = now.toLocaleTimeString('en', { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) + "." + ("000" + now.valueOf() % 1000).slice(-3);
			console.log(`[ ${flagString} ] ${currentTimeString} ${name} type check \u001b[35mstarted\u001b[39m: ${path}`);

			let tscArgs = [
				"--target", "ES2022",
				"--module", "node16",
				"--moduleResolution", "Node16",
				"--resolveJsonModule",
				"--noEmit",
				"--importHelpers",
				"--importsNotUsedAsValues", "remove",
				"--newLine", "lf",
				"--alwaysStrict",
				"--strict",
				"--strictNullChecks",
				"--strictFunctionTypes",
				"--noFallthroughCasesInSwitch",
				"--noImplicitAny",
				"--noImplicitReturns",
				"--noImplicitOverride",
			];
			let aliasSandboxFiles = ["lib/sandbox.d.ts"];

			new Promise(() => {
				let tsc = child_process.spawn("node", ["node_modules/typescript/lib/tsc.js", ...tscArgs, ...(path.endsWith(".alias.ts") ? aliasSandboxFiles : []), path]);
				tsc.stdout.pipe(process.stdout);
				tsc.stderr.pipe(process.stderr);
				tsc.on('exit', (code) => {
					let now = new Date();
					let currentTimeString = now.toLocaleTimeString('en', { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) + "." + ("000" + now.valueOf() % 1000).slice(-3);
					let passfail;
					if (code !== 0) {
						passfail = `\u001b[91m${'failed'}\u001b[39m`;
					} else {
						passfail = `\u001b[92m${'passed'}\u001b[39m`;
					};
					let timeString = `${now.valueOf() - fileTimes[path].started!.valueOf()}ms`;
					console.log(`[ ${flagString} ] ${currentTimeString} ${name} type check ${passfail} in ${timeString}: ${path}`);
				});
			});
			return { path: filepath.resolve(path) };
		});
	}
});

export { loggingPlugin, typecheckPlugin };
