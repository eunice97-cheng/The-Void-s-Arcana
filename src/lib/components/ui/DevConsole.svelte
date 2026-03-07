
<script>
    import { onMount, onDestroy } from 'svelte';
    import { isDevConsoleOpen, isDevAuthenticated, devLogs, executeDevCommand } from '../../services/devConsole';
    import { fade, fly } from 'svelte/transition';

    let input = '';
    let passwordInput = '';
    let output = [];
    let history = [];
    let historyIndex = -1;
    let scrollContainer;

    const PASSWORD = 'voids-arcana-dev'; // Simple client-side check

    function toggleConsole(e) {
        // Ctrl + Shift + ~ (Backtick)
        // Check for both '`' and '~' because e.key changes based on Shift state
        // Also check e.code for physical key location consistency
        if (e.ctrlKey && e.shiftKey && (e.key === '`' || e.key === '~' || e.code === 'Backquote')) {
            e.preventDefault();
            $isDevConsoleOpen = !$isDevConsoleOpen;
        }
    }

    function handlePasswordSubmit() {
        if (passwordInput === PASSWORD) {
            $isDevAuthenticated = true;
            addOutput('System', 'Developer access granted. Type "help" for commands.');
        } else {
            addOutput('System', 'Access denied.');
        }
        passwordInput = '';
    }

    function handleCommandSubmit() {
        if (!input.trim()) return;
        
        const cmd = input.trim();
        history = [...history, cmd];
        historyIndex = history.length;
        
        addOutput('User', cmd);
        const result = executeDevCommand(cmd);
        addOutput('System', result);
        
        input = '';
    }

    function addOutput(source, text) {
        output = [...output, { source, text, time: new Date().toLocaleTimeString() }];
        setTimeout(() => {
            if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 0);
    }

    function handleKeydown(e) {
        if (e.key === 'Enter') {
            if ($isDevAuthenticated) {
                handleCommandSubmit();
            } else {
                handlePasswordSubmit();
            }
        } else if (e.key === 'ArrowUp') {
            if (historyIndex > 0) {
                historyIndex--;
                input = history[historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            if (historyIndex < history.length - 1) {
                historyIndex++;
                input = history[historyIndex];
            } else {
                historyIndex = history.length;
                input = '';
            }
        }
    }

    onMount(() => {
        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', toggleConsole);
        }
    });

    onDestroy(() => {
        if (typeof window !== 'undefined') {
            window.removeEventListener('keydown', toggleConsole);
        }
    });
</script>

{#if $isDevConsoleOpen}
    <div class="dev-console-overlay" transition:fade={{ duration: 100 }}>
        <div class="console-window" transition:fly={{ y: -20, duration: 200 }}>
            <div class="header">
                <span>Developer Console</span>
                <button class="close-btn" on:click={() => $isDevConsoleOpen = false}>×</button>
            </div>
            
            <div class="content" bind:this={scrollContainer}>
                {#if !$isDevAuthenticated}
                    <div class="auth-screen">
                        <p>Enter Developer Password:</p>
                        <input 
                            type="password" 
                            bind:value={passwordInput} 
                            on:keydown={handleKeydown}
                            placeholder="Password..."
                            autofocus
                        />
                    </div>
                {:else}
                    <div class="logs">
                        {#each output as line}
                            <div class="log-line">
                                <span class="time">[{line.time}]</span>
                                <span class="source {line.source.toLowerCase()}">{line.source}:</span>
                                <span class="text">{line.text}</span>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            {#if $isDevAuthenticated}
                <div class="input-area">
                    <span class="prompt">></span>
                    <input 
                        type="text" 
                        bind:value={input} 
                        on:keydown={handleKeydown}
                        placeholder="Enter command..."
                        autofocus
                    />
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    .dev-console-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding-top: 50px;
        font-family: 'Consolas', 'Monaco', monospace;
    }

    .console-window {
        width: 800px;
        height: 500px;
        background: #1e1e1e;
        border: 1px solid #333;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        display: flex;
        flex-direction: column;
        border-radius: 4px;
        overflow: hidden;
    }

    .header {
        background: #2d2d2d;
        padding: 8px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #ccc;
        font-size: 12px;
        border-bottom: 1px solid #333;
    }

    .close-btn {
        background: none;
        border: none;
        color: #ccc;
        cursor: pointer;
        font-size: 16px;
    }

    .content {
        flex: 1;
        padding: 10px;
        overflow-y: auto;
        color: #d4d4d4;
        font-size: 13px;
    }

    .auth-screen {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
    }

    .auth-screen input {
        margin-top: 10px;
        padding: 8px;
        background: #333;
        border: 1px solid #444;
        color: white;
        border-radius: 4px;
    }

    .log-line {
        margin-bottom: 4px;
        line-height: 1.4;
        white-space: pre-wrap;
    }

    .time {
        color: #569cd6;
        margin-right: 8px;
    }

    .source {
        font-weight: bold;
        margin-right: 8px;
    }

    .source.system { color: #4ec9b0; }
    .source.user { color: #ce9178; }

    .input-area {
        background: #252526;
        padding: 8px;
        display: flex;
        align-items: center;
        border-top: 1px solid #333;
    }

    .prompt {
        color: #569cd6;
        margin-right: 8px;
        font-weight: bold;
    }

    .input-area input {
        flex: 1;
        background: none;
        border: none;
        color: #d4d4d4;
        font-family: inherit;
        font-size: 13px;
        outline: none;
    }
</style>
