<script>
	import { monsterBook } from '$lib/data/monsters';
	// simple helper to format numbers
	const fmt = (v) => (typeof v === 'number' ? v : String(v));
</script>

{#each monsterBook as m}
	<div class="monster">
		<div class="title">{m.name} <span class="meta">[{m.rank}]</span></div>
		<div class="meta">{m.area} • {m.element} • {m.type}</div>
		<div class="desc">{m.description}</div>
		<div class="meta">
			HP: {fmt(m.stats.hp)} | DPS: {fmt(m.stats.dps)} | ACC: {fmt(m.stats.acc)} | EVA: {fmt(
				m.stats.eva
			)} | PHY DEF: {fmt(m.stats.phyDef)} | MAG DEF: {fmt(m.stats.magDef)} | CR: {fmt(m.stats.cr)}
		</div>
	</div>
{/each}

<style>
	.monster {
		padding: 8px;
		border-bottom: 1px solid #eee;
	}
	.title {
		font-weight: bold;
	}
	.meta {
		color: #666;
		font-size: 0.9rem;
	}
	.desc {
		margin-top: 6px;
	}
</style>
