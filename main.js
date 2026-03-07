// Scene definitions
const gameScenes = [
    {
        title: 'Scene001',
        type: 'narrative',
        nextScene: 'Scene002',
        background: "url('./Images/Scene001.png') center/cover no-repeat",
        description: "You slowly open your eyes, the world swimming into focus. The sound of gentle waves lapping at the shore fills your ears. Your head throbs with a dull ache, and your mouth feels dry. Where are you? How did you get here? The last thing you remember is... nothing. It's all a blur.",
        textColor: "#9538d3"
    },
    {
        title: 'Scene002',
        type: 'narrative',
        nextScene: 'Scene003',
        previousScene: 'Scene001',
        background: "url('./Images/Scene002.png') center/cover no-repeat",
        description: "As you struggle to sit up, your vision swims again. Through the haze, you think you see a figure. The shape is indistinct, blurry around the edges. Is it real? Or just a trick of your disoriented mind?",
        textColor: "#9538d3"
    },
    {
        title: 'Scene003',
        type: 'narrative',
        nextScene: 'Scene004',
        previousScene: 'Scene002',
        background: "url('./Images/Scene003.png') center/cover no-repeat",
        description: "Your vision clears and the world snaps into focus. A young, beautiful woman is squatting before you, smiling politely.",
        textColor: "#9538d3"
    },
    {
        title: 'Scene004',
        type: 'conversation',
        nextScene: 'Scene005',
        previousScene: 'Scene003',
        background: "url('./Images/Scene004.png') center/cover no-repeat",
        npcName: "???",
        npcText: "First things first - let me help you up. You're safe here, but you look like you've been through quite an ordeal. Are you feeling dizzy? Any pain?",
        playerText: "I think I am fine, probably...?"
    },
    {
        title: 'Scene005',
        type: 'conversation',
        nextScene: 'Act1',
        previousScene: 'Scene004',
        background: "url('./Images/Scene005.png') center/cover no-repeat",
        npcName: "???",
        npcText: "Please, come with me to our town. You look hungry - let me get you some food, and we should find you clean clothes too",
        playerText: "Um... Sure... Thank you"
    },
    {
        title: 'Act1',
        type: 'narrative',
        nextScene: 'Scene006',
        background: "url('./Images/Mirror Repose.png') center/cover no-repeat",
        description: "As you walk with the mysterious woman, the path opens up to reveal a stunning coastal town nestled between lush hills and the sparkling sea. The air carries the scent of salt and blooming flowers. Wooden buildings with intricate carvings line the cobblestone streets that wind down to the waterfront.",
        textColor: "#9538d3"
    },
    {
        title: 'Scene006',
        type: 'conversation',
        nextScene: 'Scene007',
        background: "url('./Images/Scene006.png') center/cover no-repeat",
        npcName: "???",
        npcText: "Welcome to Mirror's Repose. They say the sea here is so calm and clear that it perfectly reflects the sky, like a mirror granting peace to all who gaze upon it.",
        playerText: "It's beautiful..."
    },
    {
        title: 'Scene007',
        type: 'narrative',
        nextScene: 'Scene008',
        previousScene: 'Scene006',
        background: "url('./Images/Tavern.png') center/cover no-repeat",
        description: "You are led to a small tavern where a fresh set of clothes awaits. The young woman excuses herself while you change, leaving behind only a note that simply reads: 'Meet me downstairs for food when you're ready.' Strangely, you find yourself complying without question, only realizing moments later that in your dazed state, you never even asked for her name.",
        textColor: "#9538d3"
    },
    {
        title: 'Scene008',
        type: 'narrative',
        nextScene: 'Scene009',
        previousScene: 'Scene007',
        background: "url('./Images/Tavern.png') center/cover no-repeat",
        description: "As you descend the creaking stairs, the warm glow of the tavern welcomes you. There she is, transformed - now dressed in elegant, traditional garments that seem to shimmer in the firelight. She's already seated at a corner table, where a generous spread of food and steaming drinks await, her eyes lifting to meet yours as you approach.",
        textColor: "#9538d3"
    },
    {
        title: 'Scene009',
        type: 'conversation',
        nextScene: 'Scene010',
        previousScene: 'Scene008',
        background: "url('./Images/Tavern.png') center/cover no-repeat",
        npcName: "???",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "A perfect fit, I see. You must be famished after everything that's happened. Don't be shy - eat your fill. The food is meant to be enjoyed.",
        playerText: "Don't mind if I do..."
    },
    {
        title: 'Scene010',
        type: 'narrative',
        nextScene: 'Scene011',
        previousScene: 'Scene009',
        background: "url('./Images/Tavern.png') center/cover no-repeat",
        description: "Course after course, you devour the meal with surprising appetite. The flavors dance on your tongue - rich, savory, and comforting. When you finally lean back, your hunger is gone, replaced by a warm, drowsy contentment that makes the world feel softer around the edges.",
        textColor: "#9538d3"
    },
    {
        title: 'Scene011',
        type: 'narrative',
        nextScene: 'Scene012',
        previousScene: 'Scene010',
        background: "url('./Images/Tavern.png') center/cover no-repeat",
        description: "It hits you all at once - the profound rudeness of the situation. This kind stranger rescued you, clothed you, fed you, and you haven't even exchanged the most basic courtesy of names. The realization makes your cheeks grow warm with shame. After collecting yourself, you finally pose the question that's been nagging at you... Her name...",
        textColor: "#9538d3"
    },
    {
        title: 'Scene012',
        type: 'conversation',
        nextScene: 'Scene013',
        previousScene: 'Scene011',
        background: "url('./Images/Tavern.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "I am Alexa. It's a pleasure to properly make your acquaintance. The sea brought you to me without a name. What would you have me call you?",
        playerText: "Um... not trying to be rude... but I don't actually remember my name..."
    },
    {
        title: 'Scene013',
        type: 'narrative',
        nextScene: 'Scene014',
        previousScene: 'Scene012',
        background: "url('./Images/Tavern.png') center/cover no-repeat",
        description: "You explain your predicament to her while she listens with great interest. Alexa's eyes widen slightly at the revelation, but she quickly composes herself, a thoughtful expression crossing her features.",
        textColor: "#9538d3"
    },
    {
        title: 'Scene014',
        type: 'conversation',
        nextScene: 'Scene015',
        previousScene: 'Scene013',
        background: "url('./Images/Tavern.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "Let me make sure I understand... You washed up on a deserted island with no memory of your past, then risked everything to swim here when you spotted land in the distance. The sea nearly claimed you, but you reached our shore just in time. Is that right?",
        playerText: "You've summarized it perfectly..."
    },
    {
        title: 'Scene015',
        type: 'conversation',
        nextScene: 'Scene016',
        previousScene: 'Scene014',
        background: "url('./Images/Tavern.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "Twice the ocean tried to claim you, and twice it failed. Fate rarely intervenes so obviously. You are either incredibly lucky, or you are here for a purpose. I believe it's the latter.",
        playerText: "A purpose...?"
    },
    {
        title: 'Scene016',
        type: 'conversation',
        nextScene: 'name-input',
        background: "url('./Images/Tavern.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "Yes, but... we can ponder fate another time. For now, you cannot go on without a name. Would you like to choose one for yourself, or shall I suggest one?",
        playerText: "Guess I'll just have to choose one then..."
    },
    {
        title: 'Scene017',
        type: 'conversation',
        nextScene: 'Scene018',
        background: "url('./Images/Tavern.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "[player name]... that's a good name.",
        playerText: "Thank you."
    },
    {
        title: 'Scene018',
        type: 'conversation',
        nextScene: 'Scene019',
        previousScene: 'Scene017',
        background: "url('./Images/Tavern.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "Well [player name], now that you got a name, come with me.",
        playerText: "Um... sure...."
    },
    {
        title: 'Scene019',
        type: 'conversation',
        nextScene: 'Scene020',
        previousScene: 'Scene018',
        background: "url('./Images/Inn.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "Well, here we are. This is The Pier Light. Old Berg runs the place, and his wife always keeps the rooms clean and the linens dry. You'll get a proper night's sleep here.",
        playerText: "And the other place? The one where we ate?"
    },
    {
        title: 'Scene020',
        type: 'conversation',
        nextScene: 'Scene021',
        previousScene: 'Scene019',
        background: "url('./Images/Inn.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "Oh, the Crab and Claw? The stew's the best in the cove, I'll grant you that. But you wouldn't want to bed down there. The singing and shouting from the common room doesn't stop 'til the last drunkard stumbles out. You'd get more sleep on the beach.",
        playerText: "But... about the..."
    },
    {
        title: 'Scene021',
        type: 'conversation',
        nextScene: 'Scene022',
        previousScene: 'Scene020',
        background: "url('./Images/Inn.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "Oh, don't you worry about that for a second. Berg's got a soft spot for weary travelers. I'll have a word with him.",
        playerText: "You sure he won't mind?"
    },
    {
        title: 'Scene022',
        type: 'conversation',
        nextScene: 'Scene023',
        previousScene: 'Scene021',
        background: "url('./Images/Inn2.png') center/cover no-repeat",
        npcName: "Berg",
        npcPortrait: "./Images/npc-berg.png",
        npcText: "Well, look what the tide washed in! Alexa, my dear, you've brought a guest. Ah, I heard the rumors! The one who got washed in by the tide, literally! Welcome, welcome to The Pier Light.",
        playerText: "I am [player name]. Nice to meet you."
    },
    {
        title: 'Scene023',
        type: 'conversation',
        nextScene: 'Scene024',
        previousScene: 'Scene022',
        background: "url('./Images/Inn2.png') center/cover no-repeat",
        npcName: "Berg",
        npcPortrait: "./Images/npc-berg.png",
        npcText: "Nice to meet you too, It seems our dear Alexa already got you clothed and fed. I got a room ready too, just in case. You can rest easy here.",
        playerText: "Thank you Mr. Berg... But you see..."
    },
    {
        title: 'Scene024',
        type: 'conversation',
        nextScene: 'Scene025',
        previousScene: 'Scene023',
        background: "url('./Images/Inn2.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "(Chime in quickly) Just what I have in mind. I am sure dear Old Berg won't mind sparing a room for a coinless strander for a few days.",
        playerText: "I am truly sorry sir, but I got no coins on me to pay for the room at the moment..."
    },
    {
        title: 'Scene025',
        type: 'conversation',
        nextScene: 'Scene026',
        previousScene: 'Scene024',
        background: "url('./Images/Inn2.png') center/cover no-repeat",
        npcName: "Berg",
        npcPortrait: "./Images/npc-berg.png",
        npcText: "Of course you don't need to pay right now! How can I expect a castaway to have coin? And how could I refuse Alexa's request?",
        playerText: "Thank you both... I really appreciate it. I will pay as soon as I make a living."
    },
    {
        title: 'Scene026',
        type: 'conversation',
        nextScene: 'Scene027',
        previousScene: 'Scene025',
        background: "url('./Images/Inn2.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "Well, speaking of making a living. I have the perfect idea. Will you be interested in becoming an adventurer? At least until you got your memory back.",
        playerText: "What's an adventurer?"
    },
    {
        title: 'Scene027',
        type: 'conversation',
        nextScene: 'Scene028',
        previousScene: 'Scene026',
        background: "url('./Images/Inn2.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "Good question, but the answer will be a long one. Come with me to the Guild Hall and see for yourself.",
        playerText: "Sure..."
    },
    {
        title: 'Scene028',
        type: 'conversation',
        nextScene: 'Scene029',
        previousScene: 'Scene027',
        background: "url('./Images/Guild Hall.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "Welcome to the Guild Hall of Mirror's Repose. Sorry for not mentioning this before, but I am the Guild Master here.",
        playerText: "What...? You are the Guild Master?"
    },
    {
        title: 'Scene029',
        type: 'conversation',
        nextScene: 'Scene030',
        previousScene: 'Scene028',
        background: "url('./Images/Guild Hall.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "Yes, I am. In short, a guild is an establishment that connects adventurers with clients who need various tasks done. Of course, they are ranked by difficulty and danger. It is our job to serve as a liaison between the two parties.",
        playerText: "How can I make a living doing that?"
    },
    {
        title: 'Scene030',
        type: 'conversation',
        nextScene: 'Scene031',
        previousScene: 'Scene029',
        background: "url('./Images/Guild Hall.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "Adventurers receive compensation based on the task's difficulty. Simple errands might pay a few coins, while dangerous quests could yield substantial rewards. As you complete more tasks, you'll gain experience and can take on higher-ranked quests.",
        playerText: "Sound interesting..."
    },
    {
        title: 'Scene031',
        type: 'conversation',
        nextScene: 'Scene032',
        previousScene: 'Scene030',
        background: "url('./Images/Guild Hall.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "Yes indeed. There are same establishments in most other towns as well and we are all connected through an information network, so adventurers can take jobs from other towns too. This opens up a world of opportunities for you to explore and earn a living.",
        playerText: "I see... This could work."
    },
    {
        title: 'Scene032',
        type: 'conversation',
        nextScene: 'Scene033',
        previousScene: 'Scene031',
        background: "url('./Images/Guild Hall.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "What do you think? Would you like to register as an adventurer right now?",
        playerText: "Count me in!"
    },
    {
        title: 'Scene033',
        type: 'conversation',
        nextScene: 'Scene034',
        previousScene: 'Scene032',
        background: "url('./Images/Guild Hall.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "Wonderful! But before we proceed with your registration, you will need to go through an initiate ritual.",
        playerText: "Ritual?"
    },
    {
        title: 'Scene034',
        type: 'conversation',
        nextScene: 'Scene035',
        previousScene: 'Scene033',
        background: "url('./Images/Initiate Ritual 2.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "Sorry to bring you down to our guild basement. This is Alexi. As you can see, she is my sister. She will be conducting the ritual.",
        playerText: "(They do look alike... But...)"
    },
    {
        title: 'Scene035',
        type: 'conversation',
        nextScene: 'Scene036',
        previousScene: 'Scene034',
        background: "url('./Images/Initiate Ritual 2.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "I will be waiting upstairs. Come meet me once you are done.",
        playerText: "Alright..."
    },
    {
        title: 'Scene036',
        type: 'conversation',
        nextScene: 'Scene037',
        previousScene: 'Scene035',
        background: "url('./Images/Initiate Ritual.png') center/cover no-repeat",
        npcName: "Alexi",
        npcPortrait: "./Images/npc-alexi.png",
        npcText: "Close your mouth, you'll catch flies. The real shock will come later. Now, over here.",
        playerText: "(They sure got different personalities...)"
    },
    {
        title: 'Scene037',
        type: 'conversation',
        nextScene: 'Scene038',
        previousScene: 'Scene036',
        background: "url('./Images/Initiate Ritual.png') center/cover no-repeat",
        npcName: "Alexi",
        npcPortrait: "./Images/npc-alexi.png",
        npcText: "Alright, don't make a fuss. I need a bit of your blood for this. A little prick won't hurt. You can ask questions later.",
        playerText: "Um... sure..."
    },
    {
        title: 'Scene038',
        type: 'conversation',
        nextScene: 'Scene039',
        previousScene: 'Scene037',
        background: "url('./Images/Initiate Ritual.png') center/cover no-repeat",
        npcName: "Alexi",
        npcPortrait: "./Images/npc-alexi.png",
        npcText: "Once the ritual begins, I will ask you some questions. Answer them truthfully and the spirit will guide and protect you from harm's way. Got it?",
        playerText: "Yes. I understand."
    },
    {
        title: 'Scene039',
        type: 'conversation',
        nextScene: 'Ritual-Q1',
        previousScene: 'Scene038',
        background: "url('./Images/Ritual.png') center/cover no-repeat",
        npcName: "Alexi",
        npcText: "From shadow's blood, a spirit's plea, thy inner self, now truly see. Through mists of doubt, thy path is shown, by thine own will, the way is known.",
        playerText: "(That's a little spooky...)"
    },
    {
        title: 'Ritual-Q1',
        type: 'choice',
        nextScene: 'Ritual-Q2',
        background: "url('./Images/Ritual.png') center/cover no-repeat",
        npcName: "Alexi",
        npcText: "A village elder asks for your counsel on a strange artifact found in the ancient ruins. You:",
        choices: [
            { text: "Such artifacts often carry curses - we should seal it away", trait: "N" },
            { text: "Gather the townsfolk! Everyone should witness this discovery", trait: "E" },
            { text: "Let me examine it closely - there may be forgotten magic within", trait: "O" },
            { text: "We should document its properties and study it systematically", trait: "C" },
            { text: "Whatever the elder decides, I will support their wisdom", trait: "A" }
        ]
    },
    {
        title: 'Ritual-Q2',
        type: 'choice',
        nextScene: 'Ritual-Q3',
        background: "url('./Images/Ritual.png') center/cover no-repeat",
        npcName: "Alexi",
        npcText: "When preparing for a journey through the Shadowwood, you:",
        choices: [
            { text: "I'll follow whatever path the group decides is safest", trait: "A" },
            { text: "Every rustle in the leaves sets my heart racing with dread", trait: "N" },
            { text: "I've mapped three routes with supply caches and escape paths planned", trait: "C" },
            { text: "The more companions the better! Danger fears a merry band", trait: "E" },
            { text: "I'll take the path less traveled - who knows what wonders we might find", trait: "O" }
        ]
    },
    {
        title: 'Ritual-Q3',
        type: 'choice',
        nextScene: 'Ritual-Q4',
        background: "url('./Images/Ritual.png') center/cover no-repeat",
        npcName: "Alexi",
        npcText: "At the royal feast, a noble insults your heritage. You:",
        choices: [
            { text: "My sword and I demand satisfaction at dawn!", trait: "E" },
            { text: "I should have never come here... everyone is staring", trait: "N" },
            { text: "Fascinating! Tell me more about your family's obscure traditions", trait: "O" },
            { text: "According to historical records, my lineage dates back to the First Kings", trait: "C" },
            { text: "Perhaps we misunderstand each other - let me buy you a drink", trait: "A" }
        ]
    },
    {
        title: 'Ritual-Q4',
        type: 'choice',
        nextScene: 'Ritual-Q5',
        background: "url('./Images/Ritual.png') center/cover no-repeat",
        npcName: "Alexi",
        npcText: "The ancient prophecy speaks of a 'heart of shadow.' You interpret this as:",
        choices: [
            { text: "The sorrow that binds us all - we must heal it with compassion", trait: "A" },
            { text: "A specific artifact mentioned in the Third Codex of Elders", trait: "C" },
            { text: "The inevitable doom that awaits us all", trait: "N" },
            { text: "A metaphor for the hidden magic in all living things", trait: "O" },
            { text: "The dark ambition in every ruler's heart - we must confront it boldly!", trait: "E" }
        ]
    },
    {
        title: 'Ritual-Q5',
        type: 'choice',
        nextScene: 'Ritual-Q6',
        background: "url('./Images/Ritual.png') center/cover no-repeat",
        npcName: "Alexi",
        npcText: "When the village is threatened by blight, you:",
        choices: [
            { text: "Rally everyone to work together - unity is our strength!", trait: "E" },
            { text: "This is how the great plagues began... we're all doomed", trait: "N" },
            { text: "Help the sick and elderly first - no one gets left behind", trait: "A" },
            { text: "I'll consult the ancient druidic texts for forgotten remedies", trait: "O" },
            { text: "Organize work rotations and resource distribution systematically", trait: "C" }
        ]
    },
    {
        title: 'Ritual-Q6',
        type: 'choice',
        nextScene: 'Ritual-Q7',
        background: "url('./Images/Ritual.png') center/cover no-repeat",
        npcName: "Alexi",
        npcText: "A mystical vision shows you holding a bloody sword. You believe this means:",
        choices: [
            { text: "I must analyze the vision's details - the hilt design, the blood pattern", trait: "C" },
            { text: "I cannot escape this dark fate no matter what I do", trait: "N" },
            { text: "The sword represents cutting through illusion to see truth", trait: "O" },
            { text: "I must find a peaceful way to prevent this future", trait: "A" },
            { text: "I am destined for great battles and glory!", trait: "E" }
        ]
    },
    {
        title: 'Ritual-Q7',
        type: 'choice',
        nextScene: 'Ritual-Q8',
        background: "url('./Images/Ritual.png') center/cover no-repeat",
        npcName: "Alexi",
        npcText: "The guild offers you a choice of missions. You prefer:",
        choices: [
            { text: "Guarding the quiet northern watchtower far from danger", trait: "N" },
            { text: "Exploring the uncharted Sunken City of the Ancients", trait: "O" },
            { text: "Leading the merchant caravan through bandit territory", trait: "E" },
            { text: "Mediating the border dispute between two farming villages", trait: "A" },
            { text: "Cataloging the royal archives and organizing centuries of records", trait: "C" }
        ]
    },
    {
        title: 'Ritual-Q8',
        type: 'choice',
        nextScene: 'Ritual-Q9',
        background: "url('./Images/Ritual.png') center/cover no-repeat",
        npcName: "Alexi",
        npcText: "When you discover a hidden talent for magic, you:",
        choices: [
            { text: "Use it quietly to help others without seeking recognition", trait: "A" },
            { text: "Fear the consequences of wielding such dangerous power", trait: "N" },
            { text: "Show others my amazing new abilities", trait: "E" },
            { text: "Experiment with combining different schools of magic", trait: "O" },
            { text: "Study the precise formulae and practice each gesture perfectly", trait: "C" }
        ]
    },
    {
        title: 'Ritual-Q9',
        type: 'choice',
        nextScene: 'Ritual-Q10',
        background: "url('./Images/Ritual.png') center/cover no-repeat",
        npcName: "Alexi",
        npcText: "An old hermit gives you cryptic advice. You:",
        choices: [
            { text: "Share it with everyone who might understand it better", trait: "E" },
            { text: "Worry that I've already misinterpreted his warning", trait: "N" },
            { text: "Trust that his wisdom will reveal itself in time", trait: "A" },
            { text: "Ponder the deeper meanings and hidden symbolism", trait: "O" },
            { text: "Write it down and cross-reference it with other prophecies", trait: "C" }
        ]
    },
    {
        title: 'Ritual-Q10',
        type: 'choice',
        nextScene: 'Scene040',
        background: "url('./Images/Ritual.png') center/cover no-repeat",
        npcName: "Alexi",
        npcText: "The final ritual requires a personal sacrifice. You offer:",
        choices: [
            { text: "My hope - for I have little left to give", trait: "N" },
            { text: "My voice - let my actions speak louder than words", trait: "E" },
            { text: "My comfort - I will take on others' suffering", trait: "A" },
            { text: "My memories of childhood - let imagination fill the void", trait: "O" },
            { text: "My meticulously kept journal of this entire journey", trait: "C" }
        ]
    },
    {
        title: 'Scene040',
        type: 'conversation',
        nextScene: 'Scene041',
        background: "url('./Images/Initiate Ritual.png') center/cover no-repeat",
        npcName: "Alexi",
        npcPortrait: "./Images/npc-alexi.png",
        npcText: "Finally. We're done. Take this (she thrust the vial of blood into your hand) to Alexe. She's upstairs. Don't keep her waiting.",
        playerText: "Sure, thank you."
    },
    {
        title: 'Scene041',
        type: 'conversation',
        nextScene: 'Scene042',
        previousScene: 'Scene040',
        background: "url('./Images/Initiate Ritual.png') center/cover no-repeat",
        npcName: "Alexi",
        npcPortrait: "./Images/npc-alexi.png",
        npcText: "Hey! Just a word of advice, consider this an apology for having to put up with my attitude. Your path ahead will be a bumpy one. Stay true to yourself and trust your instincts. Trust those who is worthy of your trust. Good luck out there.",
        playerText: "(Weird.... But you nod politely in response)."
    },
    {
        title: 'Scene042',
        type: 'conversation',
        nextScene: 'Scene043',
        previousScene: 'Scene041',
        background: "url('./Images/Guild Hall.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "How did it go down there? Alexi can be a bit... abrasive. But she means well, in her own way. Let me apologize on her behalf.",
        playerText: "No, it's fine. I don't mind."
    },
    {
        title: 'Scene043',
        type: 'conversation',
        nextScene: 'Scene044',
        previousScene: 'Scene042',
        background: "url('./Images/Guild Hall.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "Come, let's do what we came here for. The last step of your initiation awaits. Follow me to the uppermost floor.",
        playerText: "Sure, I can hardly wait."
    },
    {
        title: 'Scene044',
        type: 'conversation',
        nextScene: 'Scene045',
        previousScene: 'Scene043',
        background: "url('./Images/Artifact.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "This is a powerful piece of an artifact. It will reveal and unlock your potential as an adventurer. Are you ready?",
        playerText: "I am ready"
    },
    {
        title: 'Scene045',
        type: 'narrative',
        nextScene: 'Scene046',
        previousScene: 'Scene044',
        background: "url('./Images/Artifact.png') center/cover no-repeat",
        description: "Alexa takes the vial from you, places a silver card under the artifact, and pours the blood onto it. A brilliant purplish light floods the room, and you feel a surge of energy course through your veins. You feel different, as if a part of you has awakened.",
        textColor: "#9538d3"
    },
    {
        title: 'Scene046',
        type: 'narrative',
        nextScene: 'PickClass', // Changed from Scene047
        previousScene: 'Scene045',
        background: "url('./Images/Artifact.png') center/cover no-repeat",
        description: "But the surprise doesn't end there. As the blood continues to drip from the artifact onto the silver card below, strange markings begin to form upon its surface, shifting until they coalesce into readable words.",
        textColor: "#9538d3"
    },
    {
        title: 'PickClass',
        type: 'pick-class',
        nextScene: 'Scene047', // Goes to Scene047 after class selection
        previousScene: 'Scene046',
        background: "url('./Images/Ritual.png') center/cover no-repeat"
    },
    {
        title: 'Scene047',
        type: 'conversation',
        nextScene: 'Scene048',
        previousScene: 'PickClass', // Changed from Scene046
        background: "url('./Images/Artifact.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "Congratulations, [player name]. You have completed your initiation as an adventurer. This card now holds your adventurer's license. Keep it safe, as it will be your key to accepting quests and earning a living.",
        playerText: "Thank you, Alexa. I won't forget this."
    },
    {
        title: 'Scene048',
        type: 'conversation',
        nextScene: 'game',
        previousScene: 'Scene047',
        background: "url('./Images/Artifact.png') center/cover no-repeat",
        npcName: "Alexa",
        npcPortrait: "./Images/npc-alexa.png",
        npcText: "If you have any questions about being an adventurer or need guidance, don't hesitate to come to me. Just talk to the receptionist at the Guild Hall if I am not around. You should check out the town as well for some supplies before taking on your first quest.",
        playerText: "Great idea."
    },
];

// Initialize game
window.addEventListener('DOMContentLoaded', () => {
    // Register modes
    sceneManager.registerMode('narrative', NarrativeMode);
    sceneManager.registerMode('conversation', ConversationMode);

    // Add all scenes
    gameScenes.forEach(scene => sceneManager.addScene(scene));

    // Start from URL parameter or default to Scene001
    const urlParams = new URLSearchParams(window.location.search);
    const sceneParam = urlParams.get('scene');

    if (sceneParam) {
        sceneManager.loadScene(sceneParam);
    } else {
        sceneManager.loadScene('Scene001');
    }
});