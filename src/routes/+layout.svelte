<script>
	import '$lib/styles/global.css';
	// initialize background systems (regeneration tick)
	import '$lib/stores/regeneration';
	import Toast from '$lib/components/ui/Toast.svelte';
	import ElementAdv from '$lib/components/ui/ElementAdv.svelte';
	import DevConsole from '$lib/components/ui/DevConsole.svelte';

	let { children } = $props();
</script>

{@render children()}

<Toast />
<ElementAdv />
<DevConsole />
