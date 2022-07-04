import * as esbuild from 'esbuild';
import * as fs from 'fs';
import { options, helpText } from './argIntake.mjs';
import { injectReplacementContent, loggingPlugin, typecheckPlugin } from './buildPlugins.mjs';

if (options.help) {
	console.log(helpText);
	process.exit(0);
}

if (!options.node && !options.supibot) {
	console.log(helpText);
	console.error("Error: At least one of `--node' and `--supibot' must be specified");
	process.exit(1);
}

let aliasesDir = "aliases";
let entryPoints = fs.readdirSync(aliasesDir).map(i => `${aliasesDir}/${i}`);

/** @type {esbuild.BuildOptions} */
let buildOptions: esbuild.BuildOptions = {
	watch: options.watch,
	minify: options.minify,
	entryPoints,
	logLevel: 'warning',
	outdir: "build",
	treeShaking: true,
	target: "es2021",
	outExtension: {
		'.js': '.mjs'
	}
};

let waitGroup = [];

if (options.supibot) {
	let supibotLogName = `\u001b[36m${'supibot'}\u001b[39m`;
	waitGroup.push(esbuild.build({
		...buildOptions,
		drop: ["console"],
		bundle: true,
		define: {
			...buildOptions.define ?? {},
			SUPIBOT: "true"
		},
		platform: "neutral",
		entryNames: "[dir]/[name].supibot",
		plugins: [
			loggingPlugin(supibotLogName),
			typecheckPlugin(supibotLogName)
		]
	}));
}

if (options.node) {
	let nodeLogName = `\u001b[32m${"node"}\u001b[39m`;
	waitGroup.push(esbuild.build({
		...buildOptions,
		define: {
			...buildOptions.define ?? {},
			SUPIBOT: "false"
		},
		inject: [...buildOptions.inject ?? [], "lib/sandbox-impl.ts"],
		platform: "node",
		entryNames: "[dir]/[name].node",
		plugins: [
			loggingPlugin(nodeLogName),
			typecheckPlugin(nodeLogName),
			injectReplacementContent({
				filter: /\.alias\.ts$/i,
				injectContentFile: 'lib/node-alias-wrapper.js',
				targetLineTag: '@wrap-here',
				injectTo: 'wrap',
				loader: "ts",
			})
		]
	}));
}

try {
	await Promise.all(waitGroup);
} catch {
	// Errors are printed to stdout by esbuild.
	// Errors here are repeated information and look uglier
}

process.on('SIGINT', () => {
	// Wave emoji
	console.log("Bye bye, 👋");
	process.exit();
});
