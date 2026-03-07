import { z } from 'zod';

// Game state validation schema
export const gameStateSchema = z.object({
	audioEnabled: z.boolean(),
	currentScene: z.string().nullable(),
	gameInfoVisible: z.boolean(),
	settingsVisible: z.boolean(),
	uiVisible: z.boolean(),
	playerData: z
		.object({
			level: z.number().int().min(1),
			exp: z.number().int().min(0),
			maxExp: z.number().int().min(1),
			hp: z.number().int().min(0),
			maxHp: z.number().int().min(1),
			sp: z.number().int().min(0),
			maxSp: z.number().int().min(1),
			stamina: z.number().int().min(0),
			maxStamina: z.number().int().min(1),
			gold: z.number().int().min(0),
			silver: z.number().int().min(0),
			diamonds: z.number().int().min(0)
		})
		.extend({
			// optional stats object for underlying attributes (STR, DEX, INT, CON, WIS, CHA)
			stats: z
				.object({
					STR: z.number().int().min(0),
					DEX: z.number().int().min(0),
					INT: z.number().int().min(0),
					CON: z.number().int().min(0),
					WIS: z.number().int().min(0),
					CHA: z.number().int().min(0)
				})
				.optional()
		}),
	character: z.object({
		name: z.string(),
		class: z.string().nullable()
	})
});

// Save data validation schema
export const saveDataSchema = z
	.object({
		timestamp: z.number(),
		version: z.union([z.string(), z.number()]), // Accept both string and number
		character: z.object({
			name: z.string().optional(),
			class: z.string().nullable().optional(),
			sex: z.string().optional(),
			gender: z.string().optional(), // Support both 'sex' and 'gender'
			dob: z.string().optional(),
			age: z.number().optional(),
			unallocatedStatPoints: z.number().optional(),
			stats: z
				.object({
					STR: z.number().int().min(0),
					DEX: z.number().int().min(0),
					INT: z.number().int().min(0),
					CON: z.number().int().min(0),
					WIS: z.number().int().min(0),
					CHA: z.number().int().min(0)
				})
				.optional(),
			// Support old format where traits were in character
			personalityTraits: z.record(z.string(), z.number()).optional()
		}),
		// optional array of cleared scene titles to preserve navigation unlock state
		clearedScenes: z.array(z.string()).optional(),
		playerData: gameStateSchema.shape.playerData,
		personality: z.record(z.string(), z.number()).optional(), // Make optional
		traitHistory: z
			.object({
				history: z.array(
					z.object({
						trait: z.string(),
						amount: z.number(),
						source: z.string(),
						sourceId: z.union([z.string(), z.null()]).optional(),
						timestamp: z.number(),
						description: z.union([z.string(), z.null()]).optional()
					})
				),
				current: z.record(z.string(), z.number()),
				breakdown: z.record(z.string(), z.record(z.string(), z.number()))
			})
			.optional(), // Make trait history optional for backward compatibility
		settings: z
			.object({
				audioEnabled: z.boolean().optional(),
				enabled: z.boolean().optional(), // Support both naming conventions
				masterVolume: z.number().min(0).max(100).optional()
			})
			.optional(), // Make optional
		currentScene: z.string().nullable().optional(), // Make optional for older saves
		activeSlotId: z.number().nullable().optional()
	})
	.passthrough(); // Allow additional fields for forward compatibility
