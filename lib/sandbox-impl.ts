import * as fs from 'fs';
import * as filepath from 'path';
import { readFileSync, writeFileSync } from 'fs';
import * as RandomJS from "random-js";
import * as getopts from 'getopts';

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
		constructor() { }
		static readonly timeUnits = {
			y: { d: 365, h: 8760, m: 525600, s: 31536000, ms: 31536000.0e3 },
			d: { h: 24, m: 1440, s: 86400, ms: 86400.0e3 },
			h: { m: 60, s: 3600, ms: 3600.0e3 },
			m: { s: 60, ms: 60.0e3 },
			s: { ms: 1.0e3 }
		};
		private static readonly random = new RandomJS.Random(RandomJS.MersenneTwister19937.autoSeed());
		static readonly ignoreParametersDelimiter = "--";
		static readonly allowedTypes = ["string", "number", "boolean", "date", "object", "regex"];
		async getEmote(emotes: string[], fallback: string): Promise<string> {
			return emotes[0] ?? fallback;
		}
		async fetchEmotes() {
			return ["Kappa", "Keepo", "PogChamp"];
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
		parseParameter<T extends SupibotParameterType>(value: string, type: T): SupibotParameterParsedType<T> | null {
			if (!SupibotDankDebugUtilsImpl.allowedTypes.includes(type)) {
				throw new Error("Invalid value type provided");
			}

			return SupibotDankDebugUtilsImpl.parseParameter(value, type, true);
		}
		private static parseParameter<T extends SupibotParameterType>(value: string, type: T, explicit: boolean): SupibotParameterParsedType<T> | null {
			// Empty implicit string value is always invalid, since that is written as `$command param:` which is a typo/mistake
			if (type === "string" && explicit === false && value === "") {
				return null;
			}
			// Non-string parameters are also always invalid with empty string value, regardless of implicitness
			else if (type !== "string" && value === "") {
				return null;
			}

			if (type === "string") {
				// @ts-expect-error
				return String(value);
			}
			else if (type === "number") {
				const output = Number(value);
				if (!Number.isFinite(output)) {
					return null;
				}

				// @ts-expect-error
				return output;
			}
			else if (type === "boolean") {
				if (value === "true") {
					// @ts-expect-error
					return true;
				}
				else if (value === "false") {
					// @ts-expect-error
					return false;
				}
			}
			else if (type === "date") {
				const date = new Date(value);
				if (Number.isNaN(date.valueOf())) {
					return null;
				}

				// @ts-expect-error
				return date;
			}
			else if (type === "object") {
				const [key, outputValue] = value.split("=");
				// @ts-expect-error
				return { key, value: outputValue };
			}
			else if (type === "regex") {
				// @ts-expect-error
				return SupibotDankDebugUtilsImpl.parseRegExp(value);
			}

			return null;
		}

		static parseRegExp(value: string) {
			const string = value.replace(/^\/|\/$/g, "");

			// find last possible forward slash that is not escaped with a backslash
			// this determines the forceful end of a regex, which is then followed by flag characters
			// Regex: find the slash not preceded by backslashes, that is also not ultimately followed by another slash
			const lastSlashIndex = string.match(/(?<!\\)(\/)(?!.*\/)/)?.index ?? -1;

			const regexBody = (lastSlashIndex !== -1) ? string.slice(0, lastSlashIndex) : string;
			const flags = (lastSlashIndex !== -1) ? string.slice(lastSlashIndex + 1) : "";

			let regex;
			try {
				regex = new RegExp(regexBody, flags);
			}
			catch (e) {
				return null;
			}

			return regex;
		}

		parseParametersFromArguments(
			paramsDefinition: SupibotParameterDescriptor[],
			argsArray: string[]
		): {
			success: true;
			parameters: Record<string, SupibotParameterParsedType<SupibotParameterType>>;
			args: string[];
		} | {
			success: false;
			reply?: string;
		} {
			if (!Array.isArray(paramsDefinition) || paramsDefinition.some(i => typeof i.name !== "string" || typeof i.type !== "string")) {
				throw new Error("Definition must be provided as an Array of { name: string, type: string }");
			}

			else if (!Array.isArray(argsArray) || argsArray.some(i => typeof i !== "string")) {
				throw new Error("Arguments must be provided as a string Array");
			}

			return SupibotDankDebugUtilsImpl.parseParametersFromArguments(paramsDefinition, argsArray);
		}
		private static parseParametersFromArguments(
			paramsDefinition: SupibotParameterDescriptor[],
			argsArray: string[]
		): {
			success: true;
			parameters: Record<string, SupibotParameterParsedType<SupibotParameterType>>;
			args: string[];
		} | {
			success: false;
			reply?: string;
		} {
			const argsStr = argsArray.join(" ");
			const outputArguments: string[] = [];
			let parameters = {};

			// Buffer used to store read characters before we know what to do with them
			let buffer = "";
			/** Parameter definition of the current parameter @type {SupibotParameterDescriptor | null} */
			let currentParam: SupibotParameterDescriptor | null = null;
			// is true if currently reading inside of a parameter
			let insideParam = false;
			// is true if the current param started using quotes
			let quotedParam = false;

			for (let i = 0; i < argsStr.length; i++) {
				const char = argsStr[i];
				buffer += char;

				if (!insideParam) {
					if (buffer.slice(0, -1) === SupibotDankDebugUtilsImpl.ignoreParametersDelimiter && char === " ") {
						// Delimiter means all arguments after this point will be ignored, and just passed as-is
						outputArguments.push(...argsStr.slice(i + 1).split(" "));
						return {
							success: true,
							parameters,
							args: outputArguments
						};
					}

					if (char === ":") {
						currentParam = paramsDefinition.find(i => i.name === buffer.slice(0, -1)) ?? null;
						if (currentParam) {
							insideParam = true;
							buffer = "";
							if (argsStr[i + 1] === "\"") {
								i++;
								quotedParam = true;
							}
						}
					}
					else if (char === " ") {
						const sliced = buffer.slice(0, -1);
						if (sliced.length > 0) {
							outputArguments.push(sliced);
						}
						buffer = "";
					}
				}

				if (insideParam) {
					if (!quotedParam && char === " ") {
						// end of unquoted param
						const value = SupibotDankDebugUtilsImpl.parseAndAppendParameter(buffer.slice(0, -1), currentParam!, quotedParam, parameters);
						if (!value.success) {
							// @ts-ignore
							return value;
						}
						buffer = "";
						// @ts-ignore
						parameters = value.newParameters;
						insideParam = false;
						quotedParam = false;
						currentParam = null;
					}

					if (quotedParam && char === "\"") {
						if (buffer.at(-2) === "\\") {
							// remove the backslash, and add quote
							buffer = `${buffer.slice(0, -2)}"`;
						}
						else {
							// end of quoted param
							const value = SupibotDankDebugUtilsImpl.parseAndAppendParameter(buffer.slice(0, -1), currentParam!, quotedParam, parameters);
							if (!value.success) {
								// @ts-ignore
								return value;
							}
							buffer = "";
							// @ts-ignore
							parameters = value.newParameters;
							insideParam = false;
							quotedParam = false;
							currentParam = null;
						}
					}
				}
			}

			// Handle the buffer after all characters are read
			if (insideParam) {
				if (quotedParam) {
					return {
						success: false,
						reply: `Unclosed quoted parameter "${currentParam!.name}"!`
					};
				}
				else {
					const value = SupibotDankDebugUtilsImpl.parseAndAppendParameter(buffer, currentParam!, quotedParam, parameters);
					if (!value.success) {
						// @ts-ignore
						return value;
					}
					// @ts-ignore
					parameters = value.newParameters;
				}
			}
			else if (buffer !== "" && buffer !== SupibotDankDebugUtilsImpl.ignoreParametersDelimiter) {
				// Ignore the last parameter if its the delimiter
				outputArguments.push(buffer);
			}

			return {
				success: true,
				parameters,
				args: outputArguments
			};
		}

		/**
		 * Parse a parameter value from a string, and return a new parameters object with the parameter set.
		 * Fails parameter value cannot be parsed, or conflicts with previous parameters allowed.
		 * @param {string} value
		 * @param {{ name: string, type: string }} parameterDefinition
		 * @param {boolean} explicit
		 * @param {Record<string, any>} existingParameters Parameters already parsed
		 * @returns {{ success: true, newParameters: Record<string, any> } | { success: false, reply: string }}
		 */
		private static parseAndAppendParameter(value: string, parameterDefinition: SupibotParameterDescriptor, explicit: boolean, existingParameters: {}) {
			const parameters = { ...existingParameters };
			const parsedValue = SupibotDankDebugUtilsImpl.parseParameter(value, parameterDefinition.type, explicit);
			if (parsedValue === null) {
				return {
					success: false,
					reply: `Could not parse parameter "${parameterDefinition.name}"!`
				};
			}
			else if (parameterDefinition.type === "object") {
				// @ts-ignore
				if (typeof parameters[parameterDefinition.name] === "undefined") {
					// @ts-ignore
					parameters[parameterDefinition.name] = {};
				}

				// @ts-ignore
				if (typeof parameters[parameterDefinition.name][parsedValue.key] !== "undefined") {
					return {
						success: false,
						// @ts-ignore
						reply: `Cannot use multiple values for parameter "${parameterDefinition.name}", key ${parsedValue.key}!`
					};
				}

				// @ts-ignore
				parameters[parameterDefinition.name][parsedValue.key] = parsedValue.value;
			}
			else {
				// @ts-ignore
				parameters[parameterDefinition.name] = parsedValue;
			}

			return { success: true, newParameters: parameters };
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
		}
		/**
		 * Rounds a number to given amount of decimal places.
		 * @param {number} number
		 * @param {number} [places]
		 * @param {Object} options = {}
		 * @param {"ceil"|"floor"|"round"|"trunc"} [options.direction]
		 * @returns {number}
		 */
		private static round(number: number, places: number = 0, options: { direction?: "ceil" | "floor" | "round" | "trunc"; } = {}) {
			const direction = options.direction ?? "round";
			if (!["ceil", "floor", "round", "trunc"].includes(direction)) {
				throw new Error(JSON.stringify({
					message: "Invalid round direction provided",
					args: { number, places, options }
				}));
			}

			return (Math[direction](number * (10 ** places))) / (10 ** places);
		}


		capitalize(string: string) {
			return string[0]?.toUpperCase() + string.substring(1).toLowerCase();
		}
		timeDelta(target: Date, skipAffixes = false, respectLeapYears = false, deltaTo: Date | undefined = undefined) {
			if (deltaTo === undefined) {
				deltaTo = new Date();
			}

			if (target.valueOf && typeof target.valueOf() === "number") {
				target = new Date(target.valueOf());
			}
			else {
				throw new TypeError("Invalid parameter type");
			}

			if (SupibotDankDebugUtilsImpl.dateEquals(deltaTo, target)) {
				return "right now!";
			}

			let string;
			const delta = Math.abs(deltaTo.valueOf() - target.valueOf());
			const [prefix, suffix] = (target > deltaTo) ? ["in ", ""] : ["", " ago"];

			if (delta < SupibotDankDebugUtilsImpl.timeUnits.s.ms) {
				string = `${delta}ms`;
			}
			else if (delta < SupibotDankDebugUtilsImpl.timeUnits.m.ms) {
				string = `${SupibotDankDebugUtilsImpl.round(delta / SupibotDankDebugUtilsImpl.timeUnits.s.ms, 2)}s`;
			}
			else if (delta < SupibotDankDebugUtilsImpl.timeUnits.h.ms) {
				// Discards the data carried in the last 3 digits, aka milliseconds.
				// E.g. 119999ms should be parsed as "2min, 0sec"; not "1min, 59sec" because of a single millisecond.
				// Rounding to -3 turns 119999 to 120000, which makes the rounding work properly.
				const trimmed = SupibotDankDebugUtilsImpl.round(delta, -3);

				const minutes = Math.trunc(trimmed / SupibotDankDebugUtilsImpl.timeUnits.m.ms);
				const seconds = Math.trunc((trimmed / SupibotDankDebugUtilsImpl.timeUnits.s.ms) % SupibotDankDebugUtilsImpl.timeUnits.m.s);
				string = `${minutes}m, ${seconds}s`;
			}
			else if (delta < SupibotDankDebugUtilsImpl.timeUnits.d.ms) {
				// Removing one millisecond from a time delta in (hours, minutes) should not affect the result.
				const trimmed = SupibotDankDebugUtilsImpl.round(delta, -3);

				const hours = Math.trunc(trimmed / SupibotDankDebugUtilsImpl.timeUnits.h.ms);
				const minutes = Math.trunc(trimmed / SupibotDankDebugUtilsImpl.timeUnits.m.ms) % SupibotDankDebugUtilsImpl.timeUnits.h.m;
				string = `${hours}h, ${minutes}m`;
			}
			else if (delta < SupibotDankDebugUtilsImpl.timeUnits.y.ms) {
				// Removing any amount of milliseconds from a time delta in (days, minutes) should not affect the result.
				const trimmed = SupibotDankDebugUtilsImpl.round(delta, -3);

				const days = Math.trunc(trimmed / SupibotDankDebugUtilsImpl.timeUnits.d.ms);
				const hours = Math.trunc(trimmed / SupibotDankDebugUtilsImpl.timeUnits.h.ms) % SupibotDankDebugUtilsImpl.timeUnits.d.h;
				string = `${days}d, ${hours}h`;
			}
			else if (respectLeapYears) { // 365 days or more
				const [earlier, later] = (deltaTo < target) ? [deltaTo, target] : [target, deltaTo];

				// Removing any amount of milliseconds from a time delta in (days, minutes) should not affect the result.
				const trimmed = SupibotDankDebugUtilsImpl.round(delta, -3);

				const laterRounded = new Date(earlier.valueOf() + trimmed);

				// how many whole years lie between the dates?
				let years = laterRounded.getUTCFullYear() - earlier.getUTCFullYear();
				// now only a difference of <1 year remains.
				// Then calculate the remaining time range -> The remaining time delta is then represented by
				// `earlierPlusYears` and `laterRounded`
				const earlierPlusYears = new Date(earlier);
				earlierPlusYears.setUTCFullYear(earlierPlusYears.getUTCFullYear() + years);

				// this is in case `earlier` lies later "in the year" then `later`.
				// E.g. earlier=December 1 2019, later=January 1 2021 calculates
				// a year difference of `2`, but the number we want (whole years) is
				// 1.
				// I suppose a `if` would work too but I'm too afraid I would be missing edge cases by doing that.
				// Most of the time the while loop will run 0 or 1 times.
				while (earlierPlusYears.valueOf() > later.valueOf()) {
					earlierPlusYears.setUTCFullYear(earlierPlusYears.getUTCFullYear() - 1);
					years--;
				}

				// Calculate number of remaining days
				const remainingDelta = SupibotDankDebugUtilsImpl.round(laterRounded.valueOf() - earlierPlusYears.valueOf(), -4);
				const days = Math.trunc(remainingDelta / SupibotDankDebugUtilsImpl.timeUnits.d.ms);

				string = `${years}y, ${days}d`;
			}
			else { // 365 days or more
				// Removing any amount of seconds from a time delta in (years, days) should not affect the result.
				const trimmed = SupibotDankDebugUtilsImpl.round(delta, -4);

				const years = Math.trunc(trimmed / SupibotDankDebugUtilsImpl.timeUnits.y.ms);
				const days = Math.trunc(trimmed / SupibotDankDebugUtilsImpl.timeUnits.d.ms) % SupibotDankDebugUtilsImpl.timeUnits.y.d;
				string = `${years}y, ${days}d`;
			}

			return (skipAffixes)
				? string
				: (prefix + string + suffix);
		}
		/**
		 * Removes all (central European?) accents from a string.
		 * @param {string} string
		 * @returns {string}
		 */
		removeAccents(string: string) {
			return string.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
		}

		/**
		 * Wraps the input string into the given amount of characters, discarding the rest.
		 * @param {string} string
		 * @param {number} length
		 * @param {Object} options={}
		 * @param {Object} [options.keepWhitespace] If true, no whitespace
		 * @returns {string}
		 */
		wrapString(string: string, length: number, options: { keepWhitespace?: boolean; } = {}) {
			if (!options.keepWhitespace) {
				string = string.replace(/\r?\n/g, " ").replace(/\s+/g, " ");
			}

			return (string.length >= length)
				? `${string.slice(0, length - 1)}…`
				: string;
		}

		/**
		 * Pads a number with specified number of zeroes.
		 * @param {number} number
		 * @param {number} padding
		 * @returns {string}
		 */
		zf(number: number, padding: number): string {
			return ("0".repeat(padding) + number).slice(-padding);
		}
		/**
		 * Returns a random integer between min and max, inclusively.
		 * @param {number} min
		 * @param {number} max
		 * @returns {number}
		 */
		random(min: number, max: number): number {
			return SupibotDankDebugUtilsImpl.random.integer(min, max);
		}

		randArray<T>(arr: T[]): T | undefined {
			return (arr.length === 0)
				? undefined
				: arr[this.random(0, arr.length - 1)];
		}

		randomString<T extends string>(length: number, characters?: T[] | T | undefined): T {
			if (!characters) {
				// @ts-ignore
				characters = "abcdefghiklmnopqrstuvwxyzABCDEFGHIKLMNOPQRSTUVWXYZ".split("");
			}
			else if (typeof characters === "string") {
				// @ts-ignore
				characters = characters.split("");
			}
			else if (!Array.isArray(characters) || characters.some(i => typeof i !== "string")) {
				throw new Error(JSON.stringify({
					message: "Invalid input format",
					args: { characters, length }
				}));
			}

			const result = [];
			for (let i = 0; i < length; i++) {
				// @ts-ignore
				result.push(this.randArray(characters));
			}

			// @ts-ignore
			return result.join("");
		}
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
		finalReturn: undefined,
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
