import * as filepath from 'path';
import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as child_process from 'child_process';
import { options } from './argIntake.mjs';

/** @type {Record<string, boolean>} */
let flags = {
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
let loggingPlugin = (name) => ({
	name: 'supibot-typescript',
	setup(build) {
		/** @type {Record<string, { [key: string]: any }>} */
		let fileTimes = {};
		build.initialOptions.metafile = true;
		build.onLoad({ filter: /.*/ }, ({ path }) => {
			path = "./" + filepath.relative(".", path).replaceAll("\\", "/");
			fileTimes[path] ??= {};
			fileTimes[path].started = new Date();
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

			let completedFiles = Object.keys(result.metafile.inputs)
				.map(path => "./" + filepath.relative('.', path).replaceAll("\\", "/"));

			completedFiles.forEach(path => {
				let timeString = `${now - fileTimes[path]?.started}ms`;
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
let typecheckPlugin = (name) => ({
	name: 'supibot-typescript-typecheck',
	setup(build) {
		build.onResolve({ filter: /\.ts$/ }, async (args) => {
			if (options["skip-type-check"]) {
				let now = new Date();
				let currentTimeString = now.toLocaleTimeString('en', { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) + "." + ("000" + now.valueOf() % 1000).slice(-3);
				console.log(`[ ${flagString} ] ${currentTimeString} ${name} type check \u001b[33mskipped\u001b[39m`);
				return;
			}

			let fileTimes = {};
			let now = new Date();
			let path = "./" + filepath.relative(".", args.path).replaceAll("\\", "/");
			fileTimes[path] ??= {};
			fileTimes[path].started = now;
			let currentTimeString = now.toLocaleTimeString('en', { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) + "." + ("000" + now.valueOf() % 1000).slice(-3);
			console.log(`[ ${flagString} ] ${currentTimeString} ${name} type check \u001b[35mstarted\u001b[39m: ${path}`);

			let tscArgs = [
				"--target", "ES2021",
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
				"--pretty",
			];
			let commonAliasSandboxFiles = ["lib/sandbox.d.ts", "lib/common.injected.d.ts"];
			let supibotAliasSandboxFiles = [...commonAliasSandboxFiles];
			let nodeAliasSandboxFiles = [...commonAliasSandboxFiles, "lib/sandbox-impl.ts"];
			let aliasSandboxFiles = name.includes("supibot") ? supibotAliasSandboxFiles : nodeAliasSandboxFiles;

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
					let timeString = `${now - fileTimes[path]?.started}ms`;
					console.log(`[ ${flagString} ] ${currentTimeString} ${name} type check ${passfail} in ${timeString}: ${path}`);
				});
			});
			return { path: filepath.resolve(path) };
		});
	}
});

// https://stackoverflow.com/questions/3446170/ddg#6969486
function escapeRegExp(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Create a new replacement plugin. When loading specific files, replaces the first instance of a line containing a tag with different content.
 * @param {{
 * 		filter: RegExp;
 * 		targetLineTag?: string;
 * 		injectTo?: "top" | "bottom" | "wrap" | "file"
 * 		injectContent: string;
 * 		injectContent: string;
 * 		loader?: esbuild.Loader;
 * 	}} options Options
 * @param {RegExp} options.filter File to inject into
 * @param {string} [options.targetLineTag] The line to replace
 * @param {"top" | "bottom" | "wrap" | "file"} [options.injectTo] If "top" or "bottom", `options.targetLineTag` is ignored.
 * @param {string} options.injectContent File to inject into
 * @param {esbuild.Loader} [options.loader] Specify a loader to use (content-type).
 * @returns {esbuild.Plugin} esbuild plugin
 */
let injectReplacementContent = ({ filter, targetLineTag, injectContent, injectTo = "file", loader }) => ({
	name: 'inject-replacement-content',
	setup(build) {
		if (injectTo === "wrap")
			build.onLoad({ filter }, async (args) => {
				let contents = injectContent.replace(new RegExp(`^.*${escapeRegExp(targetLineTag)}.*$`, "m"), (await fs.promises.readFile(args.path)).toString());
				return { contents, loader };
			});
		else if (injectTo === "file")
			build.onLoad({ filter }, async (args) => {
				let contents = (await fs.promises.readFile(args.path)).toString().replace(new RegExp(`^.*${escapeRegExp(targetLineTag)}.*$`, "m"), injectContent);
				return { contents, loader };
			});
		else if (injectTo === "top")
			build.onLoad({ filter }, async (args) => {
				let contents = injectContent + (await fs.promises.readFile(args.path)).toString();
				return { contents, loader };
			});
		else if (injectTo === "bottom")
			build.onLoad({ filter }, async (args) => {
				let contents = (await fs.promises.readFile(args.path)).toString() + injectContent;
				return { contents, loader };
			});
		else throw new Error("injectTo has invalid value on injectReplacementContent:", injectTo);
	}
});

export { loggingPlugin, typecheckPlugin, injectReplacementContent };
