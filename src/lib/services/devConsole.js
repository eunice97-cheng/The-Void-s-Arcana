
import { get, writable } from 'svelte/store';
import { gameState, recalculateStatPoints, recalculateDerivedStats } from '../stores/gameState';
import { activeQuest } from '../stores/questStore';
import { saveManager } from '../stores/saveManager';
import skillsDb from '../data/skills.json';

// Store for logs
export const devLogs = writable([]);
export const isDevConsoleOpen = writable(false);
export const isDevAuthenticated = writable(false);

// Hook console methods to capture logs
if (typeof window !== 'undefined') {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    function captureLog(type, args) {
        const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        const entry = `[${new Date().toISOString()}] [${type.toUpperCase()}] ${msg}`;
        devLogs.update(logs => [...logs.slice(-999), entry]);
    }

    console.log = (...args) => {
        captureLog('info', args);
        originalLog.apply(console, args);
    };

    console.warn = (...args) => {
        captureLog('warn', args);
        originalWarn.apply(console, args);
    };

    console.error = (...args) => {
        captureLog('error', args);
        originalError.apply(console, args);
    };
}

// Command Registry
const commands = {
    help: {
        desc: 'List all commands',
        execute: () => {
            return Object.keys(commands).map(k => `${k}: ${commands[k].desc}`).join('\n');
        }
    },
    set_name: {
        desc: 'Change character name. Usage: set_name <name>',
        execute: (args) => {
            const name = args.join(' ');
            if (!name) return 'Error: Name required';
            gameState.update(s => {
                s.character.name = name;
                return s;
            });
            return `Name set to ${name}`;
        }
    },
    set_dob: {
        desc: 'Change character DOB. Usage: set_dob <YYYY-MM-DD>',
        execute: (args) => {
            const dob = args[0];
            if (!dob) return 'Error: DOB required';
            gameState.update(s => {
                s.character.dob = dob;
                return s;
            });
            return `DOB set to ${dob}`;
        }
    },
    set_element: {
        desc: 'Set DOB to match an element. Usage: set_element <fire|earth|air|water>',
        execute: (args) => {
            const el = args[0]?.toLowerCase();
            if (!el) return 'Error: Element required (fire, earth, air, water)';
            
            let dateStr = '';
            // Pick a representative date for each element (using year 2000)
            // Fire: Aries (Mar 21 - Apr 19) -> Mar 25
            // Earth: Taurus (Apr 20 - May 20) -> Apr 25
            // Air: Gemini (May 21 - Jun 20) -> May 25
            // Water: Cancer (Jun 21 - Jul 22) -> Jun 25
            
            if (el === 'fire') dateStr = '2000-03-25';
            else if (el === 'earth') dateStr = '2000-04-25';
            else if (el === 'air') dateStr = '2000-05-25';
            else if (el === 'water') dateStr = '2000-06-25';
            else return 'Error: Invalid element. Use fire, earth, air, or water.';

            gameState.update(s => {
                s.character.dob = dateStr;
                return s;
            });
            return `DOB set to ${dateStr} (Element: ${el})`;
        }
    },
    set_gender: {
        desc: 'Change character gender. Usage: set_gender <Male|Female|Other>',
        execute: (args) => {
            const gender = args[0];
            if (!gender) return 'Error: Gender required';
            gameState.update(s => {
                s.character.gender = gender;
                return s;
            });
            return `Gender set to ${gender}`;
        }
    },
    set_trait: {
        desc: 'Set trait points. Usage: set_trait <N|E|O|C|A> <value>',
        execute: (args) => {
            const trait = args[0]?.toUpperCase();
            const val = parseInt(args[1]);
            if (!trait || isNaN(val)) return 'Error: Trait and value required';
            gameState.update(s => {
                if (!s.character.traits) s.character.traits = {};
                s.character.traits[trait] = val;
                return s;
            });
            return `Trait ${trait} set to ${val}`;
        }
    },
    set_class: {
        desc: 'Set character class. Usage: set_class <classId>',
        execute: (args) => {
            const classId = args[0];
            if (!classId) return 'Error: Class ID required';
            gameState.update(s => {
                s.character.class = classId;
                return s;
            });
            recalculateDerivedStats();
            return `Class set to ${classId}`;
        }
    },
    reset_stats: {
        desc: 'Reset allocated stat points',
        execute: () => {
            gameState.update(s => {
                s.character.stats = { STR: 5, DEX: 5, INT: 5, CON: 5, WIS: 5, CHA: 5 };
                return s;
            });
            recalculateStatPoints();
            recalculateDerivedStats();
            return 'Stats reset';
        }
    },
    reset_skills: {
        desc: 'Reset learned skills',
        execute: () => {
            gameState.update(s => {
                s.character.skills = [];
                if (s.character.alexiTaughtElement) delete s.character.alexiTaughtElement;
                if (s.character.alexiChosenElement) delete s.character.alexiChosenElement;
                return s;
            });
            return 'Skills reset';
        }
    },
    add_currency: {
        desc: 'Add currency. Usage: add_currency <gold|silver|diamonds> <amount>',
        execute: (args) => {
            const type = args[0]?.toLowerCase();
            const amount = parseInt(args[1]);
            if (!['gold', 'silver', 'diamonds'].includes(type) || isNaN(amount)) return 'Error: Valid type and amount required';
            gameState.update(s => {
                s.playerData[type] = (s.playerData[type] || 0) + amount;
                return s;
            });
            return `Added ${amount} ${type}`;
        }
    },
    reset_daily: {
        desc: 'Reset daily quest limits',
        execute: () => {
            gameState.update(s => {
                s.character.dailyQuestSelectedDate = null;
                s.character.dailyQuestSelectedId = null;
                s.character.dailyQuestCompletedDate = null;
                return s;
            });
            return 'Daily quests reset';
        }
    },
    reset_cd: {
        desc: 'Reset all skill cooldowns',
        execute: () => {
            gameState.update(s => {
                s.character.skillCooldowns = {};
                return s;
            });
            return 'Skill cooldowns reset';
        }
    },
    reset_quest_cd: {
        desc: 'Reset cooldowns for all completed quests',
        execute: () => {
            gameState.update(s => {
                const ch = s.character || {};
                if (ch.questsCompleted) {
                    Object.keys(ch.questsCompleted).forEach(k => {
                        ch.questsCompleted[k] = 1;
                    });
                }
                return s;
            });
            return 'Quest cooldowns reset';
        }
    },
    restore_all: {
        desc: 'Fully restore HP, SP, and Stamina',
        execute: () => {
            gameState.update(s => {
                const next = { ...s };
                const pd = { ...(next.playerData || {}) };
                
                // Restore HP
                if (pd.maxHp) pd.hp = pd.maxHp;
                
                // Restore SP
                if (pd.maxSp) pd.sp = pd.maxSp;
                
                // Restore Stamina
                if (pd.maxStamina) pd.stamina = pd.maxStamina;
                
                next.playerData = pd;
                return next;
            });
            return 'HP, SP, and Stamina restored to full.';
        }
    },
    complete_quest: {
        desc: 'Force complete current active quest',
        execute: () => {
            const q = get(activeQuest);
            if (!q || q.status !== 'in_progress') return 'No active quest in progress';
            
            // Force completion logic
            activeQuest.update(curr => ({ ...curr, status: 'completed', result: 'success', endTime: Date.now() }));
            
            // Trigger completion event manually if needed, or let the store subscription handle it
            // The store subscription in questStore.js handles the update to gameState
            
            // We also need to update the character.quests list
            gameState.update(s => {
                const next = { ...s };
                if (next.character && next.character.quests) {
                    next.character.quests = next.character.quests.map(x => 
                        x.id === q.id ? { ...x, status: 'completed', result: 'success' } : x
                    );
                }
                return next;
            });

            // Dispatch event
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('quest:completed', { detail: { id: q.id } }));
            }

            return `Quest ${q.id} completed`;
        }
    },
    download_logs: {
        desc: 'Download session logs',
        execute: () => {
            if (typeof window === 'undefined') return 'Cannot download logs on server';
            const logs = get(devLogs).join('\n');
            const blob = new Blob([logs], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `voids-arcana-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return 'Logs downloaded';
        }
    }
};

export function executeDevCommand(input) {
    const parts = input.trim().split(/\s+/);
    const cmdName = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (commands[cmdName]) {
        try {
            return commands[cmdName].execute(args);
        } catch (e) {
            return `Error executing ${cmdName}: ${e.message}`;
        }
    } else {
        return `Unknown command: ${cmdName}. Type 'help' for list.`;
    }
}
