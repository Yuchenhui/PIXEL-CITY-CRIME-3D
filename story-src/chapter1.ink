// ============================================================
// 第一章：城寨入口 (Kowloon City Entrance)
// 阿城初入九龙城寨，遇见小鱼，遭遇铁手
// ============================================================

// --- External functions (bound by DialogueManager) ---
EXTERNAL giveMoney(amount)
EXTERNAL setFlag(key, value)
EXTERNAL spawnEnemies(count, type)
EXTERNAL updateWanted(change)

// --- Chapter variables ---
VAR met_little_fish = false
VAR helped_by_old_li = false
VAR passed_checkpoint = false
VAR knows_about_vinny = false

-> entrance

// ==================== Scene 1: 初到城寨 ====================
=== entrance ===

# speaker: 阿城
香港……终于到了。

# speaker: 阿城
一路上躲躲藏藏，从蛇头的船上下来，双腿还在发抖。

# speaker: 阿城
听人说九龙城寨是没人管的地方，没有身份证也能活。

{shuffle:
- 城寨的入口是一条窄巷，两边的楼房密得连阳光都挤不进来。
- 远处传来麻将的碰撞声和收音机里的粤语老歌。
- 空气里混杂着油烟、霉味和廉价烟草的气息。
}

# speaker: 阿城
前面好像有人把守……

-> checkpoint_approach

// ==================== Scene 2: 关卡前 ====================
=== checkpoint_approach ===

# speaker: 阿城
巷子尽头站着两个人，胳膊上纹着龙凤，一看就不好惹。

# speaker: 三合会马仔A
站住！呢度系私人地方，你边个？

# speaker: 阿城
我……我系嚟搵嘢做嘅。

# speaker: 三合会马仔B
又一个大陆仔。辉哥话咗，最近风声紧，唔好随便放人入嚟。

* [递上仅有的两百块钱] -> bribe_guard
* [说认识华哥] -> mention_hua
* [转身想走] -> try_leave

// ==================== Branch: 行贿 ====================
=== bribe_guard ===

# speaker: 阿城
两位大哥，小小心意……

~ giveMoney(-200)

# speaker: 三合会马仔A
（掂了掂钞票）……得啦，入去之后醒目啲，唔好搞事。

# speaker: 阿城
多谢两位大哥。

~ setFlag("bribed_guard", true)

-> enter_walled_city

// ==================== Branch: 提到华哥 ====================
=== mention_hua ===

# speaker: 阿城
我认识华哥，他叫我来的。

# speaker: 三合会马仔B
华哥？你讲嘅系茶餐厅嗰个华哥？

# speaker: 阿城
对，就是他。

# speaker: 三合会马仔A
华哥早就唔理江湖事啦。你最好唔好呃我哋。

* [坚持说是华哥介绍的] -> insist_hua
* [改口说是来打工的] -> excuse_work

= insist_hua

# speaker: 阿城
真的是华哥介绍的，他让我来找小鱼。

# speaker: 三合会马仔B
小鱼？嗰个死细路？你同佢咩关系？

# speaker: 阿城
华哥说小鱼熟悉这里的路，能帮我找到落脚的地方。

# speaker: 三合会马仔A
……算你走运。入去啦，唔好搞事。

~ setFlag("met_little_fish_hint", true)

-> enter_walled_city

= excuse_work

# speaker: 阿城
呃……其实我是来打工的，听说这里有很多活干。

# speaker: 三合会马仔A
打工？你识做咩？

# speaker: 阿城
我什么都肯做，搬货、打扫、洗碗……

# speaker: 三合会马仔B
（对同伴使了个眼色）正好，辉哥最近需要人手。

~ knows_about_vinny = true
~ setFlag("knows_vinny_early", true)

# speaker: 三合会马仔A
入去啦。记住，城寨里面辉哥最大，唔好得罪佢。

-> enter_walled_city

// ==================== Branch: 转身离开 ====================
=== try_leave ===

# speaker: 阿城
（我还是先看看有没有别的路进去。）

# speaker: 三合会马仔A
喂！你想去边？

# speaker: 阿城
（糟了，被发现了……）

~ spawnEnemies(2, "gang")

* [老实站住] -> surrender_to_guard
* [撒腿就跑] -> run_from_guard

= surrender_to_guard

# speaker: 阿城
对不起，我这就站住。

# speaker: 三合会马仔B
（搜了搜阿城的身）冇嘢嘅。大陆仔，你最好老实啲。

# speaker: 三合会马仔A
丢佢入去啦，等辉哥发落。

-> enter_walled_city

= run_from_guard

# speaker: 阿城
（我猛地转身，冲进旁边的小巷！）

# speaker: 三合会马仔A
追！捉住佢！

~ updateWanted(1)

# speaker: 阿城
（我在迷宫般的巷子里拼命跑，终于甩掉了他们。）

-> alley_encounter

// ==================== Scene 3: 进入城寨 ====================
=== enter_walled_city ===

# speaker: 阿城
（我走进了城寨。这里比我想象的还要拥挤。）

# speaker: 阿城
头顶上是密密麻麻的电线和水管，脚下的地面湿漉漉的。

{shuffle:
- 有人在阳台上晾衣服，水滴到我头上。
- 一个老太太在路边烧纸钱，嘴里念念有词。
- 几个小孩在巷子里追逐打闹，差点撞到我。
}

# speaker: 阿城
（这里的人看都不看我一眼，好像已经习惯了陌生人。）

-> meet_little_fish

// ==================== Scene 4: 小巷遭遇 ====================
=== alley_encounter ===

# speaker: 阿城
（我躲在一条死胡同里，喘着粗气。）

# speaker: 阿城
（巷子尽头坐着一个瘦小的少年，嘴里叼着根草，好奇地打量着我。）

-> meet_little_fish

// ==================== Scene 5: 遇见小鱼 ====================
=== meet_little_fish ===

# speaker: 小鱼
喂，你新嚟㗎？俾人追紧？

# speaker: 阿城
你是谁？

# speaker: 小鱼
我叫小鱼。喺城寨入面，冇人唔识我。

# speaker: 小鱼
你睇你个样，一定系大陆偷渡过嚟嘅。

# speaker: 阿城
你怎么知道？

# speaker: 小鱼
（咧嘴一笑）因为我都系。五岁嗰年跟阿妈过嚟嘅，不过阿妈已经唔喺度啦。

~ met_little_fish = true
~ setFlag("met_little_fish", true)

# speaker: 小鱼
你想喺城寨落脚？我可以带你。不过我好肚饿……

* [把仅剩的干粮分给他] -> share_food
* [答应找到住处后请他吃饭] -> promise_food
* [问他要什么条件] -> ask_condition

= share_food

# speaker: 阿城
（我把背包里最后一个馒头递给他。）

# speaker: 小鱼
（眼睛一亮，三口两口就吞了下去）好人！你系好人嚟嘅！

~ giveMoney(-50)

~ setFlag("shared_food_with_fish", true)

-> fish_guides_you

= promise_food

# speaker: 阿城
等我找到地方住，一定请你吃顿好的。

# speaker: 小鱼
（半信半疑地看着我）你有冇钱啊？

# speaker: 阿城
……不多，但够请你吃碗面。

# speaker: 小鱼
得啦，信你一次。

-> fish_guides_you

= ask_condition

# speaker: 阿城
你要什么条件？

# speaker: 小鱼
（伸出五根手指）五十蚊。带你揾到住嘅地方，五十蚊。

# speaker: 阿城
（我犹豫了一下，点了点头。）

~ giveMoney(-50)

# speaker: 小鱼
爽快！跟住我行。

-> fish_guides_you

// ==================== Scene 6: 小鱼带路 ====================
=== fish_guides_you ===

# speaker: 小鱼
城寨入面有规矩嘅。东边系辉哥嘅地盘，赌档同档口都喺嗰边。

# speaker: 小鱼
西边系邓威嘅人，佢哋做嘅嘢……你唔想知道。

# speaker: 阿城
那中间呢？

# speaker: 小鱼
中间？中间系三不管地带。华哥嘅茶餐厅就喺嗰度。

* [问关于辉哥的事] -> ask_about_vinny
* [问关于邓威的事] -> ask_about_tang
* [问关于华哥的事] -> ask_about_hua

= ask_about_vinny

# speaker: 阿城
辉哥是什么人？

# speaker: 小鱼
陈文辉。三合会三合会嘅大佬。佢控制住成个城寨嘅赌档同毒品生意。

# speaker: 小鱼
佢手下有个叫铁手嘅，好打得，你千祈唔好得罪佢哋。

~ knows_about_vinny = true
~ setFlag("knows_about_vinny", true)

-> fish_continues

= ask_about_tang

# speaker: 阿城
邓威又是什么人？

# speaker: 小鱼
从金三角过嚟嘅毒枭。同辉哥系死对头。

# speaker: 小鱼
最近两边嘅人经常冲突，城寨入面唔太平。

~ setFlag("knows_about_tang", true)

-> fish_continues

= ask_about_hua

# speaker: 阿城
华哥是谁？

# speaker: 小鱼
华哥啊，以前系三合会嘅二把手，后来金盆洗手，开咗间茶餐厅。

# speaker: 小鱼
佢系好人嚟嘅。城寨入面有咩事，佢都肯帮忙。

~ setFlag("knows_about_hua", true)

-> fish_continues

// ==================== Scene 7: 继续前行 ====================
=== fish_continues ===

# speaker: 小鱼
好啦，我带你去一个安全嘅地方。

# speaker: 小鱼
不过你要小心，前面嗰段路经常有铁手嘅人巡逻。

{shuffle:
- 远处传来一声惨叫，随即被淹没在嘈杂声中。
- 一个浑身是血的男人从我们身边跑过，没有人多看一眼。
- 楼上传来玻璃碎裂的声音，然后是争吵声。
}

# speaker: 阿城
（这个地方……比我想象的还要危险。）

-> iron_fist_encounter

// ==================== Scene 8: 遭遇铁手 ====================
=== iron_fist_encounter ===

# speaker: 小鱼
（突然拉住我）唔好出声！前面……

# speaker: 铁手
小鱼？你带嘅咩人？

# speaker: 小鱼
铁……铁手哥。佢系我朋友，新嚟嘅。

# speaker: 铁手
（打量着阿城）又一个大陆仔。辉哥话最近唔准放外人入嚟。

# speaker: 小鱼
但系佢……

# speaker: 铁手
你收声。（转向阿城）你，叫咩名？

# speaker: 阿城
阿……阿城。

# speaker: 铁手
阿城。听好，城寨有城寨嘅规矩。唔听规矩嘅人……

（铁手握了握拳头，骨节发出咔嚓声）

# speaker: 铁手
明白未？

# speaker: 阿城
明……明白。

* [低头认怂] -> submit_to_iron_fist
* [保持沉默] -> silent_defiance
* [问能否加入他们] -> ask_join

= submit_to_iron_fist

# speaker: 阿城
铁手大哥，我初来乍到，什么规矩都不懂，请多指教。

# speaker: 铁手
（冷笑一声）识做就好。小鱼，带佢走。下次再俾我见到佢喺度乱逛，就冇咁好彩啦。

~ setFlag("submitted_to_iron_fist", true)

-> chapter1_end

= silent_defiance

# speaker: 阿城
（我低下头，没有说话，但也没有示弱。）

# speaker: 铁手
（盯着我看了好一会儿）……有啲骨气。不过喺城寨，骨气唔值钱。

# speaker: 铁手
小鱼，睇住佢。出咗事你负责。

~ setFlag("defied_iron_fist", true)

-> chapter1_end

= ask_join

# speaker: 阿城
铁手大哥，我想加入你们。我什么都肯做。

# speaker: 铁手
（挑了挑眉）你想入我哋？

# speaker: 阿城
是的。我需要一份工作，需要活下去。

# speaker: 铁手
（沉默了一会儿）……辉哥最近确实需要人手。不过要入伙，就要过考验。

# speaker: 铁手
你听住，辉哥而家喺赌档。你自己去见佢。如果佢肯收你……

~ knows_about_vinny = true
~ setFlag("iron_fist_offered_intro", true)

# speaker: 铁手
我就当你系自己人。但如果佢拒绝……

（铁手冷冷一笑）

# speaker: 铁手
你就自己执生。

-> chapter1_end

// ==================== Scene 9: 第一章结束 ====================
=== chapter1_end ===

# speaker: 小鱼
（拉着我快步走过几条巷子）

# speaker: 小鱼
好彩冇事。铁手呢个人好危险嘅，你以后见到佢要行远啲。

# speaker: 阿城
谢谢你，小鱼。

# speaker: 小鱼
唔使客气。前面就系华哥嘅茶餐厅，你暂时可以喺嗰度休息。

# speaker: 小鱼
华哥人好好嘅，佢会帮你嘅。

# speaker: 阿城
（小鱼把我带到了一间小小的茶餐厅门口。招牌上写着「华记茶餐厅」。）

# speaker: 阿城
（推开门，一股热腾腾的奶茶香味扑面而来。）

~ setFlag("chapter1_complete", true)

-> END
