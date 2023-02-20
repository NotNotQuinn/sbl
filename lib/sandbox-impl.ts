// Declarations
import type { } from './sandbox';

// "Real" imports
import * as fs from 'fs';
import * as filepath from 'path';
import { readFileSync, writeFileSync } from 'fs';
import type { Parameter } from 'supi-core/@types/classes/command';
import type { JSONifiable, Emote } from 'supi-core/@types/globals';
import sbInit, { GlobalSbObject } from 'supi-core';

let Command: GlobalSbObject["Command"], Utils: GlobalSbObject["Utils"];

(async () => {
	let sb = await sbInit({
		whitelist: [
			'classes/command',
			'singletons/utils'
		],
		skipData: [
			'classes/command',
			'singletons/utils'
		]
	});
	Command = sb.Command;
	Utils = sb.Utils;
})();

export namespace __SBLJS {
	export class SupibotStoreImpl {
		filename: string;
		data: Record<string, SupibotStoreValue>;
		changed = false;

		constructor(filename: string) {
			this.filename = filename;
			if (fs.existsSync(filename)) {
				this.data = JSON.parse(readFileSync(filename).toString());
			} else {
				this.data = {};
			}
		}

		save() {
			writeFileSync(this.filename, JSON.stringify(this.data, null, '\t'));
		}

		get(key: string): SupibotStoreValue {
			return this.data[key];
		}

		set(key: string, value: SupibotStoreValue) {
			this.changed = true;
			this.data[key] = value;
			this.save();
		}

		getKeys(): string[] {
			return Object.keys(this.data);
		}
	}
	export class SupibotDankDebugUtilsImpl {
		static readonly allowedTypes = ["string", "number", "boolean", "date", "object", "regex"];
		async getEmote(emotes: string[], fallback: string): Promise<string> {
			return emotes[0] ?? fallback;
		}

		async fetchEmotes(): Promise<Emote[]> {
			return [];
		}

		unping(string: string) {
			if (typeof string !== "string") {
				throw new Error("Passed value must be a string");
			}
			else if (string.length === 0) {
				throw new Error("Empty strings cannot be unpinged");
			}

			return `${string[0]}\u{E0000}${string.slice(1)}`;
		}

		parseParameter(value: string, type: Parameter.Type): ReturnType<typeof Command.parseParameter> {
			if (!SupibotDankDebugUtilsImpl.allowedTypes.includes(type)) {
				throw new Error("Invalid value type provided");
			}

			return Command.parseParameter(value, type, true);
		}

		parseParametersFromArguments(
			paramsDefinition: Parameter.Descriptor[],
			argsArray: string[]
		): ReturnType<typeof Command.parseParametersFromArguments> {
			if (!Array.isArray(paramsDefinition) || paramsDefinition.some(i => typeof i.name !== "string" || typeof i.type !== "string")) {
				throw new Error("Definition must be provided as an Array of { name: string, type: string }");
			}

			else if (!Array.isArray(argsArray) || argsArray.some(i => typeof i !== "string")) {
				throw new Error("Arguments must be provided as a string Array");
			}

			return Command.parseParametersFromArguments(paramsDefinition, argsArray);
		}

		private static dateEquals(from: Date, to: Date) {
			const fromValue = from?.valueOf();
			const toValue = to?.valueOf();
			if (typeof fromValue !== "number") {
				throw new Error("from value cannot be converted to a number");
			}
			else if (typeof toValue !== "number") {
				throw new Error("to value cannot be converted to a number");
			}

			return (fromValue === toValue);
		};

		capitalize = Utils.capitalize;
		timeDelta = Utils.timeDelta;
		removeAccents = Utils.removeAccents;
		wrapString = Utils.wrapString;
		zf = Utils.zf;
		random = Utils.random;
		randArray = Utils.randArray;
		randomString = Utils.randomString;
	};

	export let session = {
		initialValues: {
			aliasStack: [],
			args: null,
			channel: /** @__PURE__ */filepath.parse(/** @__PURE__ */process.cwd()).base,
			executor: 'user',
			platform: 'nodejs',
			tee: [],
			customData: new SupibotStoreImpl('.tmp.customData.json'),
			channelCustomData: new SupibotStoreImpl('.tmp.channelCustomData.json'),
		},
		result: undefined,
		// TODO
		// cliOptions: getopts({
		// 	boolean
		// }),
		end() {
			// this.initialValues.customData.save();
			// this.initialValues.channelCustomData.save();
			console.log(this.result);
		}
	};
}

/**
 * Utils methods built into supibot.
 */
export const utils: SupibotDankDebugUtils =  /** @__PURE__ */ new __SBLJS.SupibotDankDebugUtilsImpl();


/**
 * The global object.
 */
export const global: typeof globalThis = globalThis;

/**
 * A list of aliases that are currently "in execution" for the current user. Similar to a call stack.
 * The first element of the array is the "highest level" alias in the stack (the one the user typed).
 * The last element is the name of the alias that started this $js invocation.
 */
export const aliasStack: string[] = __SBLJS.session.initialValues["aliasStack"];

/**
 * This variable is conditionally set based on how $js is invoked:
 * Using the function parameter, this variable will be a string array of input passed to the $js command.
 * Using the arguments parameter, this variable will be the JSON parsed form the value of the parameter (including primitives).
 *
 * In all other cases when neither the function parameter nor the arguments parameter is provided, the value is null.
 */
export const args: null | string[] | JSONifiable = __SBLJS.session.initialValues["args"];

/**
 * The channel the command is being executed in.
 * On discord, the channel is the string channel ID.
 */
export const channel = __SBLJS.session.initialValues["channel"];

/**
 * The username of the user the command was executed by.
 */
export const executor = __SBLJS.session.initialValues["executor"];

/**
 * The platform the command is being executed in.
 */
export const platform = __SBLJS.session.initialValues["platform"];

/**
 * Readonly access to the tee, see the help for `$abb tee`.
 */
export const tee: string[] = __SBLJS.session.initialValues["tee"];

/**
 * Push an item to the tee.
 */
export const _teePush: (value: string) => void = v => tee.push(v);

/**
 * A persistent key/value store tied to the current channel.
 */
export const channelCustomData: SupibotStore = __SBLJS.session.initialValues["channelCustomData"];

/**
 * A persistent key/value store tied to the current user.
 */
export const customData: SupibotStore = __SBLJS.session.initialValues["customData"];
