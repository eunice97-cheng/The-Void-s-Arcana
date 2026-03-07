// src/lib/data/scenes.js
export const gameScenes = [
	{
		title: 'Scene001',

		type: 'narrative',

		nextScene: 'Scene002',

		background: "url('/Images/Scene001.png') center/cover no-repeat",

		description:
			"You slowly open your eyes, the world swimming into focus. The sound of gentle waves lapping at the shore fills your ears. Your head throbs with a dull ache, and your mouth feels dry. Where are you? How did you get here? The last thing you remember is... almost drowned. It's all a blur.",

		textColor: '#9538d3'
	},

	// A real scene entry for free-mode so transitions use the same codepath
	// as other scenes. Keeping this as a lightweight conversation-type scene
	// lets the sceneManager find it in the scenes map and the /game route
	// render logic detect it and enable the free mode UI consistently.
	{
		title: 'free-mode',
		type: 'free-mode',
		nextScene: null,
		previousScene: 'Scene048',
		background: "url('/Images/Mirror Repose.png') center/cover no-repeat",
		description: 'Free mode hub: explore the town, interact with NPCs, and manage your inventory.',
		textColor: '#ffffff'
	},

	{
		title: 'Scene002',

		type: 'narrative',

		nextScene: 'Scene003',

		previousScene: 'Scene001',

		background: "url('/Images/Scene002.png') center/cover no-repeat",

		description:
			'As you struggle to sit up, your vision swims again. Through the haze, you think you see a figure. The shape is indistinct, blurry around the edges. Is it real? Or just a trick of your disoriented mind?',
		video: '/Videos/Awaken.mp4',

		textColor: '#9538d3'

	},

	{
		title: 'Scene003',

		type: 'narrative',

		nextScene: 'Scene004',

		background: "url('/Images/End frame - Awaken.png') center/cover no-repeat",

		description:
			'Your vision clears and the world snaps into focus. A young, beautiful woman is squatting before you, smiling politely.',

		textColor: '#9538d3'
	},

	{
		title: 'Scene004',

		type: 'conversation',

		nextScene: 'Scene005',

		previousScene: 'Scene003',

		background: "url('/Images/End frame - Awaken.png') center/cover no-repeat",

		audio: '/Audio/Scenes/004.mp3',

		npcName: '???',
		dialogueArrowRight: true,

		npcText:
			"First things first - let me help you up. You're safe here, but you look like you've been through quite an ordeal. Are you feeling dizzy? Any pain?",

		playerText: 'I think I am fine, probably...?'
	},

	{
		title: 'Scene005',

		type: 'conversation',

		nextScene: 'Act1',

		previousScene: 'Scene004',

		background: "url('/Images/End frame - Awaken.png') center/cover no-repeat",

		audio: '/Audio/Scenes/005.mp3',

		npcName: '???',
		dialogueArrowRight: true,

		npcText:
			'Please, come with me to our town. You look hungry - let me get you some food, and we should find you clean clothes too',

		playerText: 'Um... Sure... Thank you'
	},

	{
		title: 'Act1',

		type: 'narrative',

		nextScene: 'Scene006',

		background: "url('/Images/Mirror Repose.png') center/cover no-repeat",

		description:
			'As you walk with the mysterious woman, the path opens up to reveal a stunning coastal town nestled between lush hills and the sparkling sea. The air carries the scent of salt and blooming flowers. Wooden buildings with intricate carvings line the cobblestone streets that wind down to the waterfront.',

		textColor: '#9538d3'
	},

	{
		title: 'Scene006',

		type: 'conversation',

		nextScene: 'Scene007',

		background: "url('/Images/Scene006.png') center/cover no-repeat",

		audio: '/Audio/Scenes/006.mp3',

		npcName: '???',

		npcText:
			"Welcome to Mirror's Repose. They say the sea here is so calm and clear that it perfectly reflects the sky, like a mirror granting peace to all who gaze upon it.",

		playerText: "It's beautiful..."
	},

	{
		title: 'Scene007',

		type: 'narrative',

		nextScene: 'Scene008',

		previousScene: 'Scene006',

		background: "url('/Images/Tavern.png') center/cover no-repeat",

		description:
			"You are led to a small tavern where a fresh set of clothes awaits. The young woman excuses herself while you change, leaving behind only a note that simply reads: 'Meet me downstairs for food when you're ready.' Strangely, you find yourself complying without question, only realizing moments later that in your dazed state, you never even asked for her name.",

		textColor: '#9538d3'
	},

	{
		title: 'Scene008',

		type: 'narrative',

		nextScene: 'Scene009',

		previousScene: 'Scene007',

		background: "url('/Images/Tavern.png') center/cover no-repeat",

		description:
			"As you descend the creaking stairs, the warm glow of the tavern welcomes you. There she is, transformed - now dressed in elegant, traditional garments that seem to shimmer in the firelight. She's already seated at a corner table, where a generous spread of food and steaming drinks await, her eyes lifting to meet yours as you approach.",

		textColor: '#9538d3'
	},

	{
		title: 'Scene009',

		type: 'conversation',

		nextScene: 'Scene010',

		previousScene: 'Scene008',

		background: "url('/Images/Tavern.png') center/cover no-repeat",

		npcName: '???',

		audio: '/Audio/Scenes/009.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"A perfect fit I see. You must be famished after everything that's happened. Don't be shy - eat your fill. The food is meant to be enjoyed.",

		playerText: "Don't mind if I do..."
	},

	{
		title: 'Scene010',

		type: 'narrative',

		nextScene: 'Scene011',

		previousScene: 'Scene009',

		background: "url('/Images/Tavern.png') center/cover no-repeat",

		description:
			'Course after course, you devour the meal with surprising appetite. The flavors dance on your tongue - rich, savory, and comforting. When you finally lean back, your hunger is gone, replaced by a warm, drowsy contentment that makes the world feel softer around the edges.',

		textColor: '#9538d3'
	},

	{
		title: 'Scene011',

		type: 'narrative',

		nextScene: 'Scene012',

		previousScene: 'Scene010',

		background: "url('/Images/Tavern.png') center/cover no-repeat",

		description:
			"It hits you all at once - the profound rudeness of the situation. This kind stranger rescued you, clothed you, fed you, and you haven't even exchanged the most basic courtesy of names. The realization makes your cheeks grow warm with shame. After collecting yourself, you finally pose the question that's been nagging at you... Her name...",

		textColor: '#9538d3'
	},

	{
		title: 'Scene012',

		type: 'conversation',

		nextScene: 'Scene013',

		previousScene: 'Scene011',

		background: "url('/Images/Tavern.png') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/012.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"I am Alexa. It's a pleasure to properly make your acquaintance. The sea brought you to me without a name. What would you have me call you?",

		playerText: "Um... not trying to be rude... but I don't actually remember my name..."
	},

	{
		title: 'Scene013',

		type: 'narrative',

		nextScene: 'Scene014',

		previousScene: 'Scene012',

		background: "url('/Images/Tavern.png') center/cover no-repeat",

		description:
			"You explain your predicament to her while she listens with great interest. Alexa's eyes widen slightly at the revelation, but she quickly composes herself, a thoughtful expression crossing her features.",

		textColor: '#9538d3'
	},

	{
		title: 'Scene014',

		type: 'conversation',

		nextScene: 'Scene015',

		previousScene: 'Scene013',

		background: "url('/Images/Tavern.png') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/014.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			'Let me make sure I understand... You washed up on a deserted island with no memory of your past, then risked everything to swim here when you spotted land in the distance. The sea nearly claimed you, but you reached our shore just in time. Is that right?',

		playerText: "You've summarized it perfectly..."
	},

	{
		title: 'Scene015',

		type: 'conversation',

		nextScene: 'Scene016',

		previousScene: 'Scene014',

		background: "url('/Images/Tavern.png') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/015.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Twice the ocean tried to claim you, and twice it failed. Fate rarely intervenes so obviously. You are either incredibly lucky, or you are here for a purpose. I believe it's the latter.",

		playerText: 'A purpose...?'
	},

	{
		title: 'Scene016',

		type: 'conversation',

		nextScene: 'name-input',
		previousScene: 'Scene015',

		background: "url('/Images/Tavern.png') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/016.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			'Yes, but... we can ponder fate another time. For now, you cannot go on without a name. Would you like to choose one for yourself, or shall I suggest one?',

		playerText: "Guess I'll just have to choose one then..."
	},

	{
		title: 'Scene017',

		type: 'conversation',

		nextScene: 'Scene018',
		previousScene: 'Scene016',

		background: "url('/Images/Tavern.png') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/017.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText: "[player name]... that's a good name.",

		playerText: 'Thank you.'
	},

	{
		title: 'Scene018',

		type: 'conversation',

		nextScene: 'Scene019',

		previousScene: 'Scene017',

		background: "url('/Images/Tavern.png') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/018.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText: 'Well [player name], now that you got a name, come with me.',

		playerText: 'Um... sure....'
	},

	{
		title: 'Scene019',

		type: 'conversation',

		nextScene: 'Scene020',

		previousScene: 'Scene018',

		background: "url('/Images/Inn.png') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/019.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Well, here we are. This is The Pier Light. Old Berg runs the place, and his wife always keeps the rooms clean and the linens dry. You'll get a proper night's sleep here.",

		playerText: 'And the other place? The one where we ate?'
	},

	{
		title: 'Scene020',

		type: 'conversation',

		nextScene: 'Scene021',

		previousScene: 'Scene019',

		background: "url('/Images/Inn.png') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/020.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Oh, the Crab and Claw? The stew's the best in the cove, I'll grant you that. But you wouldn't want to bed down there. The singing and shouting from the common room doesn't stop 'til the last drunkard stumbles out. You'd get more sleep on the beach.",

		playerText: 'But... about the...'
	},

	{
		title: 'Scene021',

		type: 'conversation',

		nextScene: 'Scene022',

		previousScene: 'Scene020',

		background: "url('/Images/Inn.png') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/021.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Oh, don't you worry about that for a second. Berg's got a soft spot for weary travelers. I'll have a word with him.",

		playerText: "You sure he won't mind?"
	},

	{
		title: 'Scene022',

		type: 'conversation',

		nextScene: 'Scene023',

		previousScene: 'Scene021',

		background: "url('/Images/Inn2.png') center/cover no-repeat",

		npcName: 'Berg',

		audio: '/Audio/Scenes/022.mp3',

		npcPortrait: '/Images/NPC/npc-berg.PNG',

		npcText:
			"Well, look what the tide washed in! Alexa, my dear, you've brought a guest. Ah, I heard the rumors! The one who got washed in by the tide, literally! Welcome, welcome to The Pier Light.",

		playerText: 'I am [player name]. Nice to meet you.'
	},

	{
		title: 'Scene023',

		type: 'conversation',

		nextScene: 'Scene024',

		previousScene: 'Scene022',

		background: "url('/Images/Inn2.png') center/cover no-repeat",

		npcName: 'Berg',

		audio: '/Audio/Scenes/023.mp3',

		npcPortrait: '/Images/NPC/npc-berg.PNG',

		npcText:
			'Nice to meet you too, It seems our dear Alexa already got you clothed and fed. I got a room ready too, just in case. You can rest easy here.',

		playerText: 'Thank you Mr. Berg... But you see...'
	},

	{
		title: 'Scene024',

		type: 'conversation',

		nextScene: 'Scene025',

		previousScene: 'Scene023',

		background: "url('/Images/Inn2.png') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/024.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"(Chime in quickly) Just what I have in mind. I am sure dear Old Berg won't mind sparing a room for a coinless strander for a few days.",

		playerText:
			'I am truly sorry sir, but I got no coins on me to pay for the room at the moment...'
	},

	{
		title: 'Scene025',

		type: 'conversation',

		nextScene: 'Scene026',

		previousScene: 'Scene024',

		background: "url('/Images/Inn2.png') center/cover no-repeat",

		npcName: 'Berg',

		audio: '/Audio/Scenes/025.mp3',

		npcPortrait: '/Images/NPC/npc-berg.PNG',

		npcText:
			"Of course you don't need to pay right now! How can I expect a castaway to have coin? And how could I refuse Alexa's request?",

		playerText: 'Thank you both... I really appreciate it. I will pay as soon as I make a living.'
	},

	{
		title: 'Scene026',

		type: 'conversation',

		nextScene: 'Scene027',

		previousScene: 'Scene025',

		background: "url('/Images/Inn2.png') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/026.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			'Well, speaking of making a living. I have the perfect idea. Will you be interested in becoming an adventurer? At least until you got your memory back.',

		playerText: "What's an adventurer?"
	},

	{
		title: 'Scene027',

		type: 'conversation',

		nextScene: 'Scene028',

		previousScene: 'Scene026',

		background: "url('/Images/Inn2.png') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/027.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			'Good question, but the answer will be a long one. Come with me to the Guild Hall and see for yourself.',

		playerText: 'Sure...'
	},

	{
		title: 'Scene028',

		type: 'conversation',

		nextScene: 'Scene029',

		previousScene: 'Scene027',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/028.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Welcome to the Guild Hall of Mirror's Repose. Sorry for not mentioning this before, but I am the Guild Master here.",

		playerText: 'What...? You are the Guild Master?'
	},

	{
		title: 'Scene029',

		type: 'conversation',

		nextScene: 'Scene030',

		previousScene: 'Scene028',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/029.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			'Yes I am. In short, a guild is an establishment that connects adventurers with clients who need various tasks done. Of course, they are ranked by difficulty and danger. It is our job to serve as a liaison between the two parties.',

		playerText: 'How can I make a living doing that?'
	},

	{
		title: 'Scene030',

		type: 'conversation',

		nextScene: 'Scene031',

		previousScene: 'Scene029',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/030.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Adventurers receive compensation based on the task's difficulty. Simple errands might pay a few coins, while dangerous quests could yield substantial rewards. As you complete more tasks, you'll gain experience and can take on higher-ranked quests.",

		playerText: 'Sound interesting...'
	},

	{
		title: 'Scene031',

		type: 'conversation',

		nextScene: 'Scene032',

		previousScene: 'Scene030',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/031.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			'Yes indeed. There are same establishments in most other towns as well and we are all connected through an information network, so adventurers can take jobs from other towns too. This opens up a world of opportunities for you to explore and earn a living.',

		playerText: 'I see... This could work.'
	},

	{
		title: 'Scene032',

		type: 'conversation',

		nextScene: 'Scene033',

		previousScene: 'Scene031',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/032.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText: 'What do you think? Would you like to register as an adventurer right now?',

		playerText: 'Count me in!'
	},

	{
		title: 'Scene033',

		type: 'conversation',

		nextScene: 'Scene034',

		previousScene: 'Scene032',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/033.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			'Wonderful! But before we proceed with your registration, you will need to go through an initiate ritual.',

		playerText: 'Ritual?'
	},

	{
		title: 'Scene034',

		type: 'conversation',

		nextScene: 'Scene035',

		previousScene: 'Scene033',

		background: "url('/Images/Initiate Ritual 2.png') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/034.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			'Sorry to bring you down to our guild basement. This is Alexi. As you can see, she is my sister. She will be conducting the ritual.',

		playerText: '(They do look alike... But...)'
	},

	{
		title: 'Scene035',

		type: 'conversation',

		nextScene: 'Scene036',

		previousScene: 'Scene034',

		background: "url('/Images/Initiate Ritual 2.png') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/035.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText: 'I will be waiting upstairs. Come meet me once you are done.',

		playerText: 'Alright...'
	},

	{
		title: 'Scene036',

		type: 'conversation',

		nextScene: 'Scene037',

		previousScene: 'Scene035',

		background: "url('/Images/Initiate Ritual.PNG') center/cover no-repeat",

		npcName: 'Alexi',

		audio: '/Audio/Scenes/036.mp3',

		npcPortrait: '/Images/NPC/npc-alexi.PNG',

		npcText:
			"Close your mouth, you'll catch flies. The real shock will come later. Now, over here.",

		playerText: '(They sure got different personalities...)'
	},

	{
		title: 'Scene037',

		type: 'conversation',

		nextScene: 'Scene038',

		previousScene: 'Scene036',

		background: "url('/Images/Initiate Ritual.PNG') center/cover no-repeat",

		npcName: 'Alexi',

		audio: '/Audio/Scenes/037.mp3',

		npcPortrait: '/Images/NPC/npc-alexi.PNG',

		npcText:
			"Alright, don't make a fuss. I need a bit of your blood for this. A little prick won't hurt. You can ask questions later.",

		playerText: 'Um... sure...'
	},

	{
		title: 'Scene038',

		type: 'conversation',

		nextScene: 'Scene039',

		previousScene: 'Scene037',

		video: '/Videos/Traits Test 1.mp4',

		npcName: 'Alexi',

		audio: '/Audio/Scenes/038.mp3',

		npcText:
			"Once the ritual begins, I will ask you some questions. Answer them truthfully and the spirit will guide and protect you from harm's way. Got it?",

		playerText: 'Yes. I understand.'
	},

	{
		title: 'Scene039',

		type: 'conversation',

		nextScene: 'Ritual-Q1',

		video: '/Videos/Traits Test 2.mp4',

		npcName: 'Alexi',

		audio: '/Audio/Scenes/039.mp3',

		npcText:
			"From shadow's blood, a spirit's plea, thy inner self, now truly see. Through mists of doubt, thy path is shown, by thine own will, the way is known.",

		playerText: "(That's a little spooky...)"
	},

	{
		title: 'Ritual-Q1',

		type: 'choice',

		nextScene: 'Ritual-Q2',

		background: "url('/Images/Traits Test 2 End Frame.png') center/cover no-repeat",

		npcName: 'Alexi',

		npcText:
			'A village elder asks for your counsel on a strange artifact found in the ancient ruins. You:',

		choices: [
			{ text: 'Such artifacts often carry curses - we should seal it away', trait: 'N' },

			{ text: 'Gather the townsfolk! Everyone should witness this discovery', trait: 'E' },

			{ text: 'Let me examine it closely - there may be forgotten magic within', trait: 'O' },

			{ text: 'We should document its properties and study it systematically', trait: 'C' },

			{ text: 'Whatever the elder decides, I will support their wisdom', trait: 'A' }
		]
	},

	{
		title: 'Ritual-Q2',

		type: 'choice',

		nextScene: 'Ritual-Q3',

		background: "url('/Images/Traits Test 2 End Frame.png') center/cover no-repeat",

		npcName: 'Alexi',

		npcText: 'When preparing for a journey through the Shadowwood, you:',

		choices: [
			{ text: "I'll follow whatever path the group decides is safest", trait: 'A' },

			{ text: 'Every rustle in the leaves sets my heart racing with dread', trait: 'N' },

			{ text: "I've mapped three routes with supply caches and escape paths planned", trait: 'C' },

			{ text: 'The more companions the better! Danger fears a merry band', trait: 'E' },

			{
				text: "I'll take the path less traveled - who knows what wonders we might find",
				trait: 'O'
			}
		]
	},

	{
		title: 'Ritual-Q3',

		type: 'choice',

		nextScene: 'Ritual-Q4',

		background: "url('/Images/Traits Test 2 End Frame.png') center/cover no-repeat",

		npcName: 'Alexi',

		npcText: 'At the royal feast, a noble insults your heritage. You:',

		choices: [
			{ text: 'My sword and I demand satisfaction at dawn!', trait: 'E' },

			{ text: 'I should have never come here... everyone is staring', trait: 'N' },

			{ text: "Fascinating! Tell me more about your family's obscure traditions", trait: 'O' },

			{
				text: 'According to historical records, my lineage dates back to the First Kings',
				trait: 'C'
			},

			{ text: 'Perhaps we misunderstand each other - let me buy you a drink', trait: 'A' }
		]
	},

	{
		title: 'Ritual-Q4',

		type: 'choice',

		nextScene: 'Ritual-Q5',

		background: "url('/Images/Traits Test 2 End Frame.png') center/cover no-repeat",

		npcName: 'Alexi',

		npcText: "The ancient prophecy speaks of a 'heart of shadow.' You interpret this as:",

		choices: [
			{ text: 'The sorrow that binds us all - we must heal it with compassion', trait: 'A' },

			{ text: 'A specific artifact mentioned in the Third Codex of Elders', trait: 'C' },

			{ text: 'The inevitable doom that awaits us all', trait: 'N' },

			{ text: 'A metaphor for the hidden magic in all living things', trait: 'O' },

			{ text: "The dark ambition in every ruler's heart - we must confront it boldly!", trait: 'E' }
		]
	},

	{
		title: 'Ritual-Q5',

		type: 'choice',

		nextScene: 'Ritual-Q6',

		background: "url('/Images/Traits Test 2 End Frame.png') center/cover no-repeat",

		npcName: 'Alexi',

		npcText: 'When the village is threatened by blight, you:',

		choices: [
			{ text: 'Rally everyone to work together - unity is our strength!', trait: 'E' },

			{ text: "This is how the great plagues began... we're all doomed", trait: 'N' },

			{ text: 'Help the sick and elderly first - no one gets left behind', trait: 'A' },

			{ text: "I'll consult the ancient druidic texts for forgotten remedies", trait: 'O' },

			{ text: 'Organize work rotations and resource distribution systematically', trait: 'C' }
		]
	},

	{
		title: 'Ritual-Q6',

		type: 'choice',

		nextScene: 'Ritual-Q7',

		background: "url('/Images/Traits Test 2 End Frame.png') center/cover no-repeat",

		npcName: 'Alexi',

		npcText: 'A mystical vision shows you holding a bloody sword. You believe this means:',

		choices: [
			{
				text: "I must analyze the vision's details - the hilt design, the blood pattern",
				trait: 'C'
			},

			{ text: 'I cannot escape this dark fate no matter what I do', trait: 'N' },

			{ text: 'The sword represents cutting through illusion to see truth', trait: 'O' },

			{ text: 'I must find a peaceful way to prevent this future', trait: 'A' },

			{ text: 'I am destined for great battles and glory!', trait: 'E' }
		]
	},

	{
		title: 'Ritual-Q7',

		type: 'choice',

		nextScene: 'Ritual-Q8',

		background: "url('/Images/Traits Test 2 End Frame.png') center/cover no-repeat",

		npcName: 'Alexi',

		npcText: 'The guild offers you a choice of missions. You prefer:',

		choices: [
			{ text: 'Guarding the quiet northern watchtower far from danger', trait: 'N' },

			{ text: 'Exploring the uncharted Sunken City of the Ancients', trait: 'O' },

			{ text: 'Leading the merchant caravan through bandit territory', trait: 'E' },

			{ text: 'Mediating the border dispute between two farming villages', trait: 'A' },

			{ text: 'Cataloging the royal archives and organizing centuries of records', trait: 'C' }
		]
	},

	{
		title: 'Ritual-Q8',

		type: 'choice',

		nextScene: 'Ritual-Q9',

		background: "url('/Images/Traits Test 2 End Frame.png') center/cover no-repeat",

		npcName: 'Alexi',

		npcText: 'When you discover a hidden talent for magic, you:',

		choices: [
			{ text: 'Use it quietly to help others without seeking recognition', trait: 'A' },

			{ text: 'Fear the consequences of wielding such dangerous power', trait: 'N' },

			{ text: 'Show others my amazing new abilities', trait: 'E' },

			{ text: 'Experiment with combining different schools of magic', trait: 'O' },

			{ text: 'Study the precise formulae and practice each gesture perfectly', trait: 'C' }
		]
	},

	{
		title: 'Ritual-Q9',

		type: 'choice',

		nextScene: 'Ritual-Q10',

		background: "url('/Images/Traits Test 2 End Frame.png') center/cover no-repeat",

		npcName: 'Alexi',

		npcText: 'An old hermit gives you cryptic advice. You:',

		choices: [
			{ text: 'Share it with everyone who might understand it better', trait: 'E' },

			{ text: "Worry that I've already misinterpreted his warning", trait: 'N' },

			{ text: 'Trust that his wisdom will reveal itself in time', trait: 'A' },

			{ text: 'Ponder the deeper meanings and hidden symbolism', trait: 'O' },

			{ text: 'Write it down and cross-reference it with other prophecies', trait: 'C' }
		]
	},

	{
		title: 'Ritual-Q10',

		type: 'choice',

		nextScene: 'Scene040',

		background: "url('/Images/Traits Test 2 End Frame.png') center/cover no-repeat",

		npcName: 'Alexi',

		npcText: 'The final ritual requires a personal sacrifice. You offer:',

		choices: [
			{ text: 'My hope - for I have little left to give', trait: 'N' },

			{ text: 'My voice - let my actions speak louder than words', trait: 'E' },

			{ text: "My comfort - I will take on others' suffering", trait: 'A' },

			{ text: 'My memories of childhood - let imagination fill the void', trait: 'O' },

			{ text: 'My meticulously kept journal of this entire journey', trait: 'C' }
		]
	},

	{
		title: 'Scene040',

		type: 'conversation',

		nextScene: 'Scene041',

		background: "url('/Images/Initiate Ritual.PNG') center/cover no-repeat",

		npcName: 'Alexi',

		audio: '/Audio/Scenes/040.mp3',

		npcPortrait: '/Images/NPC/npc-alexi.PNG',

		npcText:
			"Finally. We're done. Take this (she thrust the vial of blood into your hand) to Alexa. She's upstairs. Don't keep her waiting.",

		playerText: 'Sure, thank you.'
	},

	{
		title: 'Scene041',

		type: 'conversation',

		nextScene: 'Scene042',

		previousScene: 'Scene040',

		background: "url('/Images/Initiate Ritual.PNG') center/cover no-repeat",

		npcName: 'Alexi',

		audio: '/Audio/Scenes/041.mp3',

		npcPortrait: '/Images/NPC/npc-alexi.PNG',

		npcText:
			'Hey! Just a word of advice, consider this an apology for having to put up with my attitude. Your path ahead will be a bumpy one. Stay true to yourself and trust your instincts. Trust those who is worthy of your trust. Good luck out there.',

		playerText: '(Weird.... But you nod politely in response).'
	},

	{
		title: 'Scene042',

		type: 'conversation',

		nextScene: 'Scene043',

		previousScene: 'Scene041',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/042.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			'How did it go down there? Alexi can be a bit... abrasive. But she means well, in her own way. Let me apologize on her behalf.',

		playerText: "No, it's fine. I don't mind."
	},

	{
		title: 'Scene043',

		type: 'conversation',

		nextScene: 'Scene044',

		previousScene: 'Scene042',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/043.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Come, let's do what we came here for. The last step of your initiation awaits. Follow me to the uppermost floor.",

		playerText: 'Sure, I can hardly wait.'
	},

	{
		title: 'Scene044',

		type: 'conversation',

		nextScene: 'Scene045',

		previousScene: 'Scene043',

		background: "url('/Images/Artifact.PNG') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/044.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			'This is a powerful piece of an artifact. It will reveal and unlock your potential as an adventurer. Are you ready?',

		playerText: 'I am ready'
	},

	{
		title: 'Scene045',

		type: 'narrative',

		nextScene: 'Scene046',

		previousScene: 'Scene044',

		background: "url('/Images/Artifact.PNG') center/cover no-repeat",

		description:
			'Alexa takes the vial from you, places a silver card under the artifact, and pours the blood onto it. A brilliant purplish light floods the room, and you feel a surge of energy course through your veins. You feel different, as if a part of you has awakened.',

		textColor: '#9538d3'
	},

	{
		title: 'Scene046',

		type: 'narrative',

		nextScene: 'PickClass', // Changed from Scene047

		previousScene: 'Scene045',

		background: "url('/Images/Artifact.PNG') center/cover no-repeat",

		description:
			"But the surprise doesn't end there. As the blood continues to drip from the artifact onto the silver card below, strange markings begin to form upon its surface, shifting until they coalesce into readable words.",

		textColor: '#9538d3'
	},

	{
		title: 'PickClass',

		type: 'pick-class',

		nextScene: 'Scene047', // Goes to Scene047 after class selection

		previousScene: 'Scene046',

		background: "url('/Images/Ritual.png') center/cover no-repeat"
	},

	{
		title: 'Scene047',

		type: 'conversation',

		nextScene: 'Scene048',

		previousScene: 'PickClass', // Changed from Scene046

		background: "url('/Images/Artifact.PNG') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/047.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Congratulations, [player name]. You have completed your initiation as an adventurer. This card now holds your adventurer's license. Keep it safe, as it will be your key to accepting quests and earning a living.",

		playerText: "Thank you, Alexa. I won't forget this."
	},

	{
		title: 'Scene048',

		type: 'conversation',

		// After Scene048 we want to enter free mode (hub). Change the next scene
		// from the special route 'game' to a scene titled 'free-mode' so the
		// `+page.svelte` subscription can detect it and enable the free-mode store.
		nextScene: 'free-mode',

		previousScene: 'Scene057',

		background: "url('/Images/Artifact.PNG') center/cover no-repeat",

		npcName: 'Alexa',

		audio: '/Audio/Scenes/048.mp3',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"If you have any questions about being an adventurer or need guidance, don't hesitate to come to me. Just talk to the receptionist at the Guild Hall if I am not around. You should check out the town as well for some supplies before taking on your first quest.",

		playerText: 'Great idea.'
	},

	{
		title: 'Scene049',

		type: 'conversation',

		audio: '/Audio/Scenes/049.mp3',

		nextScene: 'Scene050',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"How are you, [player name]? I heard you've been a big help lately.",

		playerText: "I'm well, thank you. I try to be useful where I can."
	},

	{
		title: 'Scene050',

		type: 'conversation',

		audio: '/Audio/Scenes/050.mp3',

		nextScene: 'Scene051',

		previousScene: 'Scene049',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Oh, that reminds me. I have something I've been meaning to give you.",

		playerText: "Oh, really? What is it?"
	},

	{
		title: 'Scene051',

		type: 'conversation',

		audio: '/Audio/Scenes/051.mp3',

		nextScene: 'Scene052',

		previousScene: 'Scene050',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"A map of the region. I thought it might help you on your travels.",

		playerText: "Thank you, Alexa. This will be very useful."
	},

	{
		title: 'Scene052',

		type: 'conversation',

		audio: '/Audio/Scenes/052.mp3',

		nextScene: 'Scene053',

		previousScene: 'Scene051',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Oh, wait a second. Who said anything about it being free?",

		playerText: "Whoa, whoa. You got my gratitude all ready to go. I definitely thought this was free."
	},

	{
		title: 'Scene053',

		type: 'conversation',

		audio: '/Audio/Scenes/053.mp3',

		nextScene: 'Scene054',

		previousScene: 'Scene052',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"(A polite, knowing laugh escapes her) Alexi is right. It is fun to tease you. Tell you what—I will let you have it for free if you do me a favor.",

		playerText: "A favor for a map? That sounds like the start of a good story. What's the task?"
	},

	{
		title: 'Scene054',

		type: 'conversation',

		audio: '/Audio/Scenes/054.mp3',

		nextScene: 'Scene055',

		previousScene: 'Scene053',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"I need to visit some places outside of the town and you will be my escort. It's not dangerous, but it will be a perfect chance to show you around the area.",

		playerText: "Sound like you are giving me map plus a tour for free. I'm in."
	},

	{
		title: 'Scene055',

		type: 'conversation',

		audio: '/Audio/Scenes/055.mp3',

		nextScene: 'Scene056',

		previousScene: 'Scene054',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"More reason for you not to refuse. Here is the map and we are leaving right away.",

		playerText: "Thank you, I am ready to go."
	},

	{
		title: 'Scene056',

		type: 'narrative',

		nextScene: 'Scene057',

		previousScene: 'Scene055',

		background: "url('/Images/Scene056.jpg') center/cover no-repeat",

		description:
			"The carriage was already waiting outside the guild hall. You and Alexa got in, and it started moving, making its way to the first unknown destination.",

		textColor: '#9538d3'
	},

	{
		title: 'Scene057',

		type: 'narrative',

		nextScene: 'Scene058',

		previousScene: 'Scene056',

		background: "url('/Images/Carriage.png') center/cover no-repeat",

		description:
			"As the town falls away and open countryside spreads before you, you can’t resist taking out the map you received earlier.",

		textColor: '#9538d3'
	},

	{
		title: 'Scene058',

		type: 'narrative',

		nextScene: 'Scene059',

		previousScene: 'Scene057',

		background: "url('/Images/Maps/Aeleris Region.png') center no-repeat",

		
		description: 'Aeleris Region Map', 

		textColor: '#9538d3'
	},

	{
		title: 'Scene059',

		type: 'conversation',

		audio: '/Audio/Scenes/059.mp3',

		nextScene: 'Scene060',

		previousScene: 'Scene058',

		background: "url('/Images/Carriage.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Allow me to explain.",

		playerText: "Sure, thank you."
	},

	{
		title: 'Scene060',

		type: 'conversation',

		audio: '/Audio/Scenes/060.mp3',

		nextScene: 'Scene061',

		previousScene: 'Scene059',

		background: "url('/Images/Carriage.png') center/cover no-repeat",

		foregroundImage: '/Images/Maps/Aeleris Region.png',

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"This is where we are, the Mirror's Repose Town in the southwest of Aeleris Region. There is a city in this region and a few towns and villages. We are heading to Sandy Bay which is east from here.",

		playerText: "I see"
	},

	{
		title: 'Scene061',

		type: 'narrative',

		nextScene: 'Scene062',

		previousScene: 'Scene060',

		background: "url('/Images/Goldenseed Valley.png') center/cover no-repeat",

		description:
			"Looking out the window, there is a village coming into your sight...",

		textColor: '#9538d3'
	},

	{
		title: 'Scene062',

		type: 'conversation',

		audio: '/Audio/Scenes/062.mp3',

		nextScene: 'Scene063',

		previousScene: 'Scene061',

		background: "url('/Images/Goldenseed Valley.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"This is Goldenseed Valley. This farming village is very close to our town. The scenery here is beautiful at sunset. Too bad we aren't going to be stopping here today.",

		playerText: "It is a quiet and peaceful village"
	},

	{
		title: 'Scene063',

		type: 'narrative',

		nextScene: 'Scene064',

		previousScene: 'Scene062',

		background: "url('/Images/Carriage.png') center/cover no-repeat",

		description:
			"Alexa was busy reading some documents she brought along, while you continued enjoying the scenery outside. Somehow, you fell asleep.",

		textColor: '#9538d3'
	},

	{
		title: 'Scene064',

		type: 'conversation',

		audio: '/Audio/Scenes/064.mp3',

		nextScene: 'Scene065',

		previousScene: 'Scene063',

		background: "url('/Images/Sandy Bay.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Wake up [player name]! We are here.",

		playerText: "Here? Where?..."
	},

	{
		title: 'Scene065',

		type: 'conversation',

		audio: '/Audio/Scenes/065.mp3',

		nextScene: 'Scene066',

		previousScene: 'Scene064',

		background: "url('/Images/Sandy Bay.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Sandy Bay of course.",

		playerText: "Ah, yes... I remember now."
	},

	{
		title: 'Scene066',

		type: 'conversation',

		audio: '/Audio/Scenes/066.mp3',

		nextScene: 'Scene067',

		previousScene: 'Scene065',

		background: "url('/Images/Sandy Bay.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Come, let us head to the Guild Hall.",

		playerText: "Sure."
	},

	{
		title: 'Scene067',

		type: 'narrative',

		nextScene: 'Scene068',

		previousScene: 'Scene066',

		background: "url('/Images/Sandy Bay.png') center/cover no-repeat",

		description:
			"Sandy Bay is surprisingly rural. Forests line both sides of the town. Like Mirror’s Repose, it is a coastal settlement, but it is poorer and remains mostly undeveloped.",

		textColor: '#9538d3'
	},

	{
		title: 'Scene068',

		type: 'narrative',

		nextScene: 'Scene069',

		previousScene: 'Scene067',

		background: "url('/Images/Sandy Bay Guild Hall.png') center/cover no-repeat",

		description:
			"As you stepped into the building, you noticed that, though aged, the Guild Hall stood clean and orderly—a stark contrast to the rest of the town. It was clear the local management made the most of what little they had.",

		textColor: '#9538d3'
	},

	{
		title: 'Scene069',

		type: 'conversation',

		audio: '/Audio/Scenes/069.mp3',

		nextScene: 'Scene070',

		previousScene: 'Scene068',

		background: "url('/Images/Sandy Bay Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Here, let me introduce you to the staff here. Inil and Kendra.",

		playerText: "Sure"
	},

	{
		title: 'Scene070',

		type: 'conversation',

		audio: '/Audio/Scenes/070.mp3',

		nextScene: 'Scene071',

		previousScene: 'Scene069',

		background: "url('/Images/Sandy Bay Guild Hall.png') center/cover no-repeat",

		npcName: 'Inil',

		npcPortrait: '/Images/NPC/npc-inil.png',

		npcText:
			"Hello there. I am Inil, nice to meet you!",

		playerText: "I am [player name]. Nice to meet you too."
	},

	{
		title: 'Scene071',

		type: 'conversation',

		audio: '/Audio/Scenes/071.mp3',

		nextScene: 'Scene072',

		previousScene: 'Scene070',

		background: "url('/Images/Sandy Bay Guild Hall.png') center/cover no-repeat",

		npcName: 'Kendra',

		npcPortrait: '/Images/NPC/npc-kendra.png',

		npcText:
			"Hi. I am Kendra, nice to meet you!",

		playerText: "I am [player name]. Nice to meet you too."
	},

	{
		title: 'Scene072',

		type: 'conversation',

		audio: '/Audio/Scenes/072.mp3',

		nextScene: 'Scene073',

		previousScene: 'Scene071',

		background: "url('/Images/Sandy Bay Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"I am here to meet Sir Akinwunmi, the Guild Master. He's been sick and I am not sure if he is better now.",

		playerText: "Oh my, I hope he is."
	},

	{
		title: 'Scene073',

		type: 'conversation',

		audio: '/Audio/Scenes/073.mp3',

		nextScene: 'Scene074',

		previousScene: 'Scene072',

		background: "url('/Images/Sandy Bay Guild Hall.png') center/cover no-repeat",

		npcName: 'Akinwunmi',

		npcPortrait: '/Images/NPC/npc-akinwunmi.png',

		npcText:
			"(Popping up behind you unexpectedly) .Of course I am! This old man ain't goin' anywhere yet. Ha-ha-ha—cough hack...!",

		playerText: "(Wow... A scary old man...)"
	},

	{
		title: 'Scene074',

		type: 'conversation',

		audio: '/Audio/Scenes/074.mp3',

		nextScene: 'Scene075',

		previousScene: 'Scene073',

		background: "url('/Images/Sandy Bay Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Speaking of the devil!",

		playerText: "He is Sir Akinwunmi?"
	},

	{
		title: 'Scene075',

		type: 'conversation',

		audio: '/Audio/Scenes/075.mp3',

		nextScene: 'Scene076',

		previousScene: 'Scene074',

		background: "url('/Images/Sandy Bay Guild Hall.png') center/cover no-repeat",

		npcName: 'Akinwunmi',

		npcPortrait: '/Images/NPC/npc-akinwunmi.png',

		npcText:
			"The one and only Akinwunmi! I’ve got Alexa to thank—she sent her rascal of a sister, Alexus, to help with the guild management while I was laid up sick. She’s the one who showed that this old man can't afford to die yet. Ha-ha-ha—cough hack...!",

		playerText: "Alexus?"
	},

	{
		title: 'Scene076',

		type: 'conversation',

		audio: '/Audio/Scenes/076.mp3',

		nextScene: 'Scene077',

		previousScene: 'Scene075',

		background: "url('/Images/Sandy Bay Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"You never met her yet [playerName]. Alexi is my twin, Alexus is our younger sister. She is a bit of a rebel... I do hope she didn't trouble people...",

		playerText: "An abrasive twin sister and now a rebelious younger sister? (I wonder if they all look alike...)"
	},

	{
		title: 'Scene077',

		type: 'conversation',

		audio: '/Audio/Scenes/077.mp3',

		nextScene: 'Scene078',

		previousScene: 'Scene076',

		background: "url('/Images/Sandy Bay Guild Hall.png') center/cover no-repeat",

		npcName: 'Akinwunmi',

		npcPortrait: '/Images/NPC/npc-akinwunmi.png',

		npcText:
			"Don’t you worry about a thing, Alexa. She did a fine job with the management works, cleared off some outstanding requests, plus terrorized some adventurers in the process!",

		playerText: "What?... Terrorized?"
	},

	{
		title: 'Scene078',

		type: 'conversation',

		audio: '/Audio/Scenes/078.mp3',

		nextScene: 'Scene079',

		previousScene: 'Scene077',

		background: "url('/Images/Sandy Bay Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Oh my... I am so sorry Sir Akinwunmi. I will properly lecture her later.",

		playerText: "I don't mean to interupt Alexa. But where is this younger sister you mentioned?"
	},

	{
		title: 'Scene079',

		type: 'conversation',

		audio: '/Audio/Scenes/079.mp3',

		nextScene: 'Scene080',

		previousScene: 'Scene078',

		background: "url('/Images/Sandy Bay Guild Hall.png') center/cover no-repeat",

		npcName: 'Akinwunmi',

		npcPortrait: '/Images/NPC/npc-akinwunmi.png',

		npcText:
			"Good observation [playerName]! She already left! Told me this morning she is heading back to Mirror's Repose since I am already up and running! Ha-ha-ha!",

		playerText: "If I had to guess, picking her up was one of Alexa's motives for coming…"
	},

	{
		title: 'Scene080',

		type: 'conversation',

		audio: '/Audio/Scenes/080.mp3',

		nextScene: 'Scene081',

		previousScene: 'Scene079',

		background: "url('/Images/Sandy Bay Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Clearly NOT anymore! My objective will be to hunt her down later! (She shook her head, her frustrated expression undercut by a faint, reluctant concern)",

		playerText: "I think she will do fine Alexa. You shouldn't worry."
	},

	{
		title: 'Scene081',

		type: 'narrative',

		nextScene: 'Scene082',

		previousScene: 'Scene080',

		background: "url('/Images/Sandy Bay Guild Hall.png') center/cover no-repeat",

		description:
			"Alexa and Akinwunmi sat down and went over some documents. They further discussed how to help Sandy Bay's development by expanding its guild operations. The town's security was also one of the concerns they addressed.",

		textColor: '#9538d3'
	},

	{
		title: 'Scene082',

		type: 'narrative',

		nextScene: 'Scene083',

		previousScene: 'Scene081',

		background: "url('/Images/Carriage.png') center/cover no-repeat",

		description:
			"During the return trip, Alexa remained unusually quiet, her gaze locked on the passing scenery outside the window. Her silence spoke clearly—she was worried about Alexus.",

		textColor: '#9538d3'
	},

	{
		title: 'Scene083',

		type: 'conversation',

		audio: '/Audio/Scenes/083.mp3',

		nextScene: 'Scene084',

		previousScene: 'Scene082',

		background: "url('/Images/Carriage.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"We will drop by Glimmerdell on our way back. Alexus might be there.",

		playerText: "Sure"
	},

	{
		title: 'Scene084',

		type: 'narrative',

		nextScene: 'Scene085',

		previousScene: 'Scene083',

		background: "url('/Images/Carriage.png') center/cover no-repeat",

		description:
			"As you traveled, three thoughts circled in your mind. What awaited in Glimmerdell? Was Alexus truly there? And what history lay between the three sisters?",

		textColor: '#9538d3'
	},

	{
		title: 'Scene085',

		type: 'conversation',

		audio: '/Audio/Scenes/085.mp3',

		nextScene: 'Scene086',

		previousScene: 'Scene084',

		background: "url('/Images/Glimmerdell.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Here we are. This is Glimmerdell, the mining town. It is between Mirror's Repose and Sandy Bay. Let's go to the Guild Hall and ask around for Alexus. I should introduce you to the staff here as well.",

		playerText: "Sure"
	},

	{
		title: 'Scene086',

		type: 'conversation',

		audio: '/Audio/Scenes/086.mp3',

		nextScene: 'Scene087',

		previousScene: 'Scene085',

		background: "url('/Images/Glimmerdell Guild Hall.jpg') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"This is Ron. I think Hana isn't around today.",

		playerText: "Hi, I am [player name]. Nice to meet you."
	},

	{
		title: 'Scene087',

		type: 'conversation',

		audio: '/Audio/Scenes/087.mp3',

		nextScene: 'Scene088',

		previousScene: 'Scene086',

		background: "url('/Images/Glimmerdell Guild Hall.jpg') center/cover no-repeat",

		npcName: 'Ron',

		npcPortrait: '/Images/NPC/npc-ron.png',

		npcText:
			"Hi [player name]! Nice to meet you. Yes Alexa, Hana is on leave today. Don't worry [player name], I am sure you will meet her some other time.",

		playerText: "Yes, I am sure I will."
	},

	{
		title: 'Scene088',

		type: 'conversation',

		audio: '/Audio/Scenes/088.mp3',

		nextScene: 'Scene089',

		previousScene: 'Scene087',

		background: "url('/Images/Glimmerdell Guild Hall.jpg') center/cover no-repeat",

		npcName: 'Ron',

		npcPortrait: '/Images/NPC/npc-ron.png',

		npcText:
			"Are you here to meet Norman as well?",

		playerText: "Norman?"
	},

	{
		title: 'Scene089',

		type: 'conversation',

		audio: '/Audio/Scenes/089.mp3',

		nextScene: 'Scene090',

		previousScene: 'Scene088',

		background: "url('/Images/Glimmerdell Guild Hall.jpg') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"(A bit indecisive...) No, not really. I just wanted to check if Alexus is around.",

		playerText: "(Weird... She seems nervous...)"
	},

	{
		title: 'Scene090',

		type: 'conversation',

		audio: '/Audio/Scenes/090.mp3',

		nextScene: 'Scene091',

		previousScene: 'Scene089',

		background: "url('/Images/Glimmerdell Guild Hall.jpg') center/cover no-repeat",

		npcName: 'Norman',

		npcPortrait: '/Images/NPC/npc-norman.png',

		npcText:
			"Hello Alexa, long time no see! (Suddenly popped up behind your back) And yet you ain't here looking for me. Who is your friend?",

		playerText: "(Damn! Do all Guild Masters pop up behind people like that?) Hi, I am [player name]. Nice to meet you."
	},

	{
		title: 'Scene091',

		type: 'conversation',

		audio: '/Audio/Scenes/091.mp3',

		nextScene: 'Scene092',

		previousScene: 'Scene090',

		background: "url('/Images/Glimmerdell Guild Hall.jpg') center/cover no-repeat",

		npcName: 'Norman',

		npcPortrait: '/Images/NPC/npc-norman.png',

		npcText:
			"Nice to meet you too, [player name]. So, you are Alexa's friend huh? What brings you to Glimmerdell?",

		playerText: "We are just passing by and we are wondering if Alexus is around."
	},

	{
		title: 'Scene092',

		type: 'conversation',

		audio: '/Audio/Scenes/092.mp3',

		nextScene: 'Scene093',

		previousScene: 'Scene091',

		background: "url('/Images/Glimmerdell Guild Hall.jpg') center/cover no-repeat",

		npcName: 'Norman',

		npcPortrait: '/Images/NPC/npc-norman.png',

		npcText:
			"Oh, Alexus... She left a while ago. I asked her to stay for a drink, but she always comes and goes like a storm.",

		playerText: "I see... Thank you. I think we should be going now and try to catch up with her."
	},

	{
		title: 'Scene093',

		type: 'narrative',

		nextScene: 'Scene094',

		previousScene: 'Scene092',

		background: "url('/Images/Carriage.png') center/cover no-repeat",

		description:
			"The carriage rolled on and Alexa sat silently, her thoughts seemingly far away. But you sensed a different kind of concern in her eyes now... Before you tried to ask, she spoke up.",

		textColor: '#9538d3'
	},

	{
		title: 'Scene094',

		type: 'conversation',

		audio: '/Audio/Scenes/094.mp3',

		nextScene: 'Scene095',

		previousScene: 'Scene093',

		background: "url('/Images/Carriage.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"I am sorry [player name]. I must have worried you with my behavior. After knowing Alexus is on her route back to Mirror's Repose, I am no longer worried about her. After all, she is more than capable of taking care of herself.",

		playerText: "That's good to know. But I still sense a great discomfort within you, ever since Norman showed up earlier."
	},

	{
		title: 'Scene095',

		type: 'conversation',

		audio: '/Audio/Scenes/095.mp3',

		nextScene: 'Scene096',

		previousScene: 'Scene094',

		background: "url('/Images/Carriage.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Very perceptive of you, [player name]. It's true that meeting Norman is unsettling for me. You might have noticed it but he isn't running things the way a Guild Master should. Glimmerdell is making a fortune from mining and he is using his authority as Guild Master to prioritize quests related to mining, neglecting other important aspects like town security and welfare of the adventurers. He cares more about profit than people.",

		playerText: "How can someone like that be a Guild Master anyway?"
	},

	{
		title: 'Scene096',

		type: 'conversation',

		audio: '/Audio/Scenes/096.mp3',

		nextScene: 'Scene097',

		previousScene: 'Scene095',

		background: "url('/Images/Carriage.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"The townspeople support him, unfortunately. He has somehow convinced them—blinding them with the wealth from the mines—to the point where they prioritize defending the mines over their own lives. As a guild master, he should get his priorities straight and put the safety and well-being of the people first. And yet he is doing it the other way around.",

		playerText: "That's terrible."

	},

	{
		title: 'Scene097',

		type: 'narrative',

		nextScene: 'Scene098',

		previousScene: 'Scene096',

		background: "url('/Images/Scene056.jpg') center/cover no-repeat",

		description:
			"Before you realized it, the carriage had already pulled up in front of the Mirror’s Repose Guild Hall. Alexa sighed, a mix of relief and lingering concern evident in her expression as she prepared to disembark.",

		textColor: '#9538d3'
	},

	{
		title: 'Scene098',

		type: 'conversation',

		audio: '/Audio/Scenes/098.mp3',

		nextScene: 'Scene099',

		previousScene: 'Scene097',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Home sweet home. Thank you for accompanying me today, [player name]. It means a lot to me.",

		playerText: "You're welcome, Alexa. It was my pleasure."

	},

	{
		title: 'Scene099',

		type: 'conversation',

		audio: '/Audio/Scenes/099.mp3',

		nextScene: 'Scene100',

		previousScene: 'Scene098',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Now then, if I know my sister...",

		playerText: "Oh yeah, I was about to ask...(and the door swings open...)"

	},

	{
		title: 'Scene100',

		type: 'conversation',

		audio: '/Audio/Scenes/100.mp3',

		nextScene: 'Scene101',

		previousScene: 'Scene099',

		background: "black",

		video: '/Videos/AlexusEntrance.mp4',

		npcName: '???',

		npcText: "...",

		playerText: "(Why is everyone running away? and why is she glaring at me like that...?!)"
	},

	{
		title: 'Scene101',

		type: 'conversation',

		audio: '/Audio/Scenes/101.mp3',

		nextScene: 'Scene102',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Let me properly introduce you to my sister, Alexus.",

		playerText: "Erm... Hi, I am [player name]. Nice to meet you."

	},

	{
		title: 'Scene102',

		type: 'conversation',

		audio: '/Audio/Scenes/102.mp3',

		nextScene: 'Scene103',

		previousScene: 'Scene101',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexus',

		npcPortrait: '/Images/NPC/npc-alexus.png',

		npcText:
			"So you are the one who have been hanging around my sister for the whole day...",

		playerText: "(Will she stick me with that spear if  I answer yes...?)"

	},

	{
		title: 'Scene103',

		type: 'conversation',

		audio: '/Audio/Scenes/103.mp3',

		nextScene: 'Scene104',

		previousScene: 'Scene102',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexi',

		npcPortrait: '/Images/NPC/npc-alexi.PNG',

		npcText:
			"Hey, knock it off! (And she literally knocked Alexus head with her knuckle). Is that how you greet someone who ran around all day with Alexa to look for you?",

		playerText: "(Ah, thank goodness... Alexi is here... Phew...)"

	},

	{
		title: 'Scene104',

		type: 'conversation',

		audio: '/Audio/Scenes/104.mp3',

		nextScene: 'Scene105',

		previousScene: 'Scene103',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexus',

		npcPortrait: '/Images/NPC/npc-alexus.png',

		npcText:
			"Ouch! That hurt! (Rubbing her head) Fine, fine. No need to get physical. I am just curious who Alexa is hanging out with, that's all.",

		playerText: "Sorry about that... (Wait... why am I apologizing to her...?)"

	},

	{
		title: 'Scene105',

		type: 'conversation',

		audio: '/Audio/Scenes/105.mp3',

		nextScene: 'Scene106',

		previousScene: 'Scene104',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Goodness, Alexi, Alexus, both of you! Sorry about this [player name]. You don't have to apologize for anything.",

		playerText: "Yeah, I guess I don't. (This family is something else...)"

	},

	{
		title: 'Scene106',

		type: 'conversation',

		audio: '/Audio/Scenes/106.mp3',

		nextScene: 'free-mode',

		previousScene: 'Scene105',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Thank you for today, [player name]. I hope we can hang out together again sometime.",

		playerText: "Sure"

	},

	{
		title: 'Scene107',

		type: 'narrative',

		audio: '/Audio/Forest.mp3',

		nextScene: 'Alexus Spear Training Scene',

		background: "url('/Images/Scene107.png') center/cover no-repeat",

		description:
			"The forest south of Mirror's Repose is a tranquil, safe haven. Its wildlife is tame, its paths are peaceful, and true beasts seldom disturb the quiet. Yet, as you walk beneath its boughs, a single question echoes in your mind: why would Alexus summon you to such a placid place?",

		textColor: '#9538d3'
	},

	{
		title: 'Alexus Spear Training Scene',

		type: 'narrative',

		nextScene: 'Scene108',

		previousScene: 'Scene107',

		video: '/Videos/Alexus Spear Training.mp4',

		description: '',

		textColor: '#ffffff'
	},

	{
		title: 'Scene108',

		type: 'conversation',

		audio: '/Audio/Scenes/108.mp3',

		nextScene: 'Scene109',

		background: "url('/Images/Scene107.png') center/cover no-repeat",

		npcName: 'Alexus',

		npcPortrait: '/Images/NPC/npc-alexus.png',

		npcText:
			"So, you are finally here.",

		playerText: "Yes, Alexus. What is this about? (I hope she isn't going to attack me... and bury me in this forest...)"

	},

	{
		title: 'Scene109',

		type: 'conversation',

		audio: '/Audio/Scenes/109.mp3',

		nextScene: 'Scene110',

		previousScene: 'Scene108',

		background: "url('/Images/Scene107.png') center/cover no-repeat",

		npcName: 'Alexus',

		npcPortrait: '/Images/NPC/npc-alexus.png',

		npcText:
			"I usually come here for some training, but today I have something for you.",

		playerText: "Something for me?"
	},

	{
		title: 'Scene110',

		type: 'conversation',

		audio: '/Audio/Scenes/110.mp3',

		nextScene: 'HorseScene',

		previousScene: 'Scene109',

		background: "url('/Images/Scene107.png') center/cover no-repeat",

		npcName: 'Alexus',

		npcPortrait: '/Images/NPC/npc-alexus.png',

		npcText:
			"Yeah, I got lectured from both Alexa and Alexi earlier for being rude to you, so I thought I should pay you back in some way.",

		playerText: "(Shit... I knew it... She is going to kill me...)"
	},

	{
		title: 'HorseScene',

		type: 'narrative',

		nextScene: 'Scene111',

		previousScene: 'Scene110',

		video: '/Videos/HorseScene.mp4',

		description: '',

		textColor: '#ffffff'
	},

	{
		title: 'Scene111',

		type: 'conversation',

		audio: '/Audio/Scenes/111.mp3',

		nextScene: 'Scene112',

		background: "url('/Images/Scene107.png') center/cover no-repeat",

		npcName: 'Alexus',

		npcPortrait: '/Images/NPC/npc-alexus.png',

		npcText:
			"Here, she is Sierra. I tamed her a few days ago. Alexa told me you are going to need a ride to travel around, questing and adventuring. ",

		playerText: "Wow! That's great. I thought you are going to kill and bury me here when you said you are going to pay me back in some way for being lectured."
	},

	{
		title: 'Scene112',

		type: 'conversation',

		audio: '/Audio/Scenes/112.mp3',

		nextScene: 'Scene113',

		previousScene: 'Scene111',

		background: "url('/Images/Scene107.png') center/cover no-repeat",

		npcName: 'Alexus',

		npcPortrait: '/Images/NPC/npc-alexus.png',

		npcText:
			"Hey! That's rude! I wouldn't do that. I don't get it... Why is everyone so scared of me anyway?",

		playerText: "No offense but maybe it is the way you talk... or your choice of words... or your glare... or your spear... or all of the above...?"
	},

	{
		title: 'Scene113',

		type: 'conversation',

		audio: '/Audio/Scenes/113.mp3',

		nextScene: 'free-mode',

		previousScene: 'Scene112',

		background: "url('/Images/Scene107.png') center/cover no-repeat",

		npcName: 'Alexus',

		npcPortrait: '/Images/NPC/npc-alexus.png',

		npcText:
			"Really? Hmph... Sound complicated, trying to understand people standards these days. Anyway, I am giving you Sierra as a gift and as my apology. Take good care of her, alright?",

		playerText: "Sure. Thank you, Alexus. (I guess she isn't that bad after all... probably not much experience interacting with people...)"
	},

	{
		title: 'Scene114',

		type: 'conversation',

		audio: null,

		nextScene: 'Scene115',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Sorry to suddenly ask you to come. I have a request for you which I can't post as a guild quest.",

		playerText: "Tell me about it"
	},

	{
		title: 'Scene115',

		type: 'conversation',

		audio: null,

		nextScene: 'Choice001',

		previousScene: 'Scene114',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"I am sure you still remember about the issue with Glimmerdell... This is a request from Smith. He is the current mayor of Glimmerdell. He wants me to look for someone trustworthy to help him with some investigation work.",

		playerText: "Let me guess, Norman?"
	},

	{
		title: 'Choice001',

		type: 'choice',

		audio: null,

		nextScene: 'Scene116',

		previousScene: 'Scene115',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"Yes. Honestly, as Guild Master, I can't make this request officially. It's against guild rules to interfere in another town's politics, so the decision is yours.",

		choices: [
			{ text: 'I am worried about the townsfolk too, but breaking guild rules could start a feud. Maybe I can privately suggest the mayor hire an outside agent, and I will unofficially offer advice.', trait: 'A' },

			{ text: 'I will gather public support first. If the townsfolk demand an investigation, it is not politics—it is the will of the people. I will lead the charge openly so everyone sees the guild stands for justice.', trait: 'E' },

			{ text: 'Rules are flexible for true justice. I will handle it undercover—not as a guild member, but as a freelance investigator hired by concerned citizens. We will find a creative loophole.', trait: 'O' },

			{ text: 'This puts us in a terrible position! If we investigate, we are breaking rules; if we do not, people suffer. I need ironclad protection from the mayor in writing before I even consider this.', trait: 'N' },

			{ text: 'I will review the guild charter and town law first. If there is a legal pathway—like if the mayor files an official complaint through the proper channels—then I will proceed strictly by the book.', trait: 'C' }
		]
	},

	{
		title: 'Scene116',

		type: 'conversation',

		audio: null,

		nextScene: 'free-mode',

		previousScene: 'Scene115',

		background: "url('/Images/Guild Hall.png') center/cover no-repeat",

		npcName: 'Alexa',

		npcPortrait: '/Images/NPC/npc-alexa.PNG',

		npcText:
			"In that case, please go meet Smith in Glimmerdell Town Hall before you make your decision. I will respect whatever final choice you make.",

		playerText: "Sure. I will head there right away."
	},
];


