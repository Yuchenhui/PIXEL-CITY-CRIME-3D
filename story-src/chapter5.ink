// ============================================================
// 第五章：权力斗争 (Power Struggle)
// 内部冲突，刀疤登场，叛徒现形
// ============================================================

EXTERNAL giveMoney(amount)
EXTERNAL setFlag(key, value)
EXTERNAL spawnEnemies(count, type)
EXTERNAL updateWanted(change)

VAR met_blade = false
VAR knows_traitor = false
VAR traitor_identity = "unknown"
VAR trust_vinny = 0
VAR trust_tang = 0
VAR survived_assassination = false

-> power_struggle_start

// ==================== Scene 1: 风暴前夕 ====================
=== power_struggle_start ===

# speaker: 阿城
城寨的空气里弥漫着火药味。辉哥和邓威的冲突已经从暗斗变成了明争。

# speaker: 阿城
每天都有人在巷子里被打，有人的店铺被砸。城寨的居民人心惶惶。

# speaker: 华哥
阿城，你要小心。最近城寨入面好乱。

# speaker: 阿城
华哥，你知道些什么？

# speaker: 华哥
我听到风声——邓威请咗个杀手入嚟。

# speaker: 阿城
杀手？

# speaker: 华哥
叫刀疤。东南亚嚟嘅，专做呢行。据说佢从未失手过。

~ setFlag("heard_about_blade", true)

# speaker: 华哥
仲有……辉哥身边可能有内鬼。

# speaker: 阿城
内鬼？

# speaker: 华哥
我唔确定。但系最近辉哥嘅几次行动都被人提前知道了。唔系有内鬼，点解会咁？

~ setFlag("hua_warned_traitor", true)

# speaker: 阿城
华哥的话让我警觉起来。辉哥身边的人，谁会是叛徒？

-> investigate_start

// ==================== Scene 2: 调查叛徒 ====================
=== investigate_start ===

# speaker: 阿城
我决定暗中调查。辉哥身边最亲近的人有几个。

* [调查铁手] -> investigate_iron_fist
* [调查阿辉] -> investigate_ah_fai
* [调查其他手下] -> investigate_others

= investigate_iron_fist

# speaker: 阿城
铁手是辉哥最信任的人。如果他是叛徒……

# speaker: 阿城
我暗中观察了铁手几天。他似乎没有什么异常。

# speaker: 阿城
但有一天晚上，我看到铁手偷偷去了城寨西边——那是邓威的地盘。

# speaker: 阿城
铁手在一间屋子里待了半个小时才出来。出来的时候，他四处张望。

~ setFlag("suspicious_iron_fist", true)

# speaker: 阿城
铁手……真的是叛徒吗？

-> traitor_reveal

= investigate_ah_fai

# speaker: 阿城
阿辉是华哥的徒弟，现在沦落成了瘾君子。

# speaker: 阿城
我找到了他。他蜷缩在一条小巷的角落里，浑身发抖。

# speaker: 阿城
阿辉？

# speaker: 阿辉
你……你系边个？

# speaker: 阿城
我是阿城。华哥的朋友。

# speaker: 阿辉
华哥……华哥如果知道我变成咁样，一定会好失望。

# speaker: 阿城
阿辉，你知道最近城寨里面发生的事吗？

# speaker: 阿辉
你唔好问我。我咩都唔知。

* [追问] -> press_ah_fai
* [放过他] -> let_ah_fai_go

= press_ah_fai

# speaker: 阿城
阿辉，你知道什么就告诉我。这关系到很多人的性命。

# speaker: 阿辉
辉哥身边嘅人……有人同邓威有联络。

# speaker: 阿城
谁？

# speaker: 阿辉
我……我唔敢讲。佢哋会杀咗我。

~ setFlag("ah_fai_knows_traitor", true)

-> traitor_reveal

= let_ah_fai_go

# speaker: 阿城
算了，他太脆弱了。我不忍心逼他。

-> traitor_reveal

= investigate_others

# speaker: 阿城
我观察了辉哥手下的几个老部下。他们看起来都很正常。

# speaker: 阿城
但我注意到，每次辉哥的行动计划被泄露，都有一个人在场——铁手。

~ setFlag("suspicious_iron_fist", true)

-> traitor_reveal

// ==================== Scene 3: 辉哥的计划 ====================
=== traitor_reveal ===

# speaker: 阿城
还没等我查清叛徒的身份，事情就发生了。

# speaker: 阿城
一天夜里，辉哥召集了所有人开会。

# speaker: 陈文辉
各位，最近嘅情况大家都知道。邓威嘅人越来越过分。

# speaker: 陈文辉
我决定，主动出击。明晚，我哋要突袭邓威嘅老巢。

# speaker: 铁手
辉哥，我哋嘅人手够唔够？

# speaker: 陈文辉
够。铁手，你带第一队。阿城，你带第二队。

# speaker: 铁手
辉哥，阿城新嚟嘅，佢带得嚟吗？

# speaker: 陈文辉
铁手，我决定嘅事，你有意见？

# speaker: 铁手
冇。

~ setFlag("vinny_plans_attack", true)

# speaker: 阿城
但我心里隐隐觉得不安。这个计划，会不会已经泄露了？

-> night_before_attack

// ==================== Scene 4: 刺杀 ====================
=== night_before_attack ===

# speaker: 阿城
突袭的前一晚，我独自走在城寨的巷子里。

# speaker: 阿城
突然，一个黑影从暗处闪出！

# speaker: 刀疤
唔好动。

# speaker: 阿城
你是谁？

# speaker: 刀疤
我叫刀疤。有人出钱买你条命。

~ met_blade = true
~ setFlag("met_blade", true)

# speaker: 阿城
刀锋冰冷地贴着我的皮肤。我能闻到刀上的血腥味。

# speaker: 刀疤
不过……我从来唔做免费嘅嘢。有人出双倍价钱，话要留你一条命。

* [问谁出的钱] -> ask_who_paid
* [趁他说话时反击] -> fight_blade
* [试图说服他] -> persuade_blade

= ask_who_paid

# speaker: 阿城
谁出钱保我的命？

# speaker: 刀疤
你以为我会讲？做我哋呢行嘅，第一条规矩就系——唔好出卖雇主。

# speaker: 刀疤
但系我可以话你知——出钱买你命嘅人，就喺你身边。

~ knows_traitor = true
~ setFlag("blade_hinted_traitor", true)

# speaker: 阿城
叛徒……就在辉哥身边。

# speaker: 刀疤
今日我唔杀你。但系你要记住——下次，就冇咁好彩啦。

-> blade_leaves

= fight_blade

# speaker: 阿城
我猛地用手肘撞向刀疤的手臂！

~ spawnEnemies(1, "heavy")

# speaker: 刀疤
刀偏了，但没有脱手。他反手就是一拳！

# speaker: 阿城
我被打倒在地，嘴角渗出血来。

# speaker: 刀疤
有胆量。但系你唔系我嘅对手。今日放过你。

~ survived_assassination = true

-> blade_leaves

= persuade_blade

# speaker: 阿城
刀疤，你是为了钱做事。但你想过没有——你杀了我，辉哥会放过你吗？

# speaker: 刀疤
辉哥？你以为辉哥仲有几耐？

# speaker: 刀疤
后生仔，城寨嘅天要变啦。你最好揾定退路。

# speaker: 刀疤
今日放你一马。下次见面就冇嘢好讲啦。

-> blade_leaves

// ==================== Scene 5: 刀疤离去 ====================
=== blade_leaves ===

# speaker: 阿城
刀疤消失在黑暗中，只留下淡淡的血腥味。

# speaker: 阿城
我的手在发抖。但我知道，我没有时间害怕。

# speaker: 阿城
明天的突袭，很可能是一个陷阱。

* [告诉辉哥可能有内鬼] -> warn_vinny
* [自己暗中调查] -> investigate_solo
* [去找华哥商量] -> consult_hua

= warn_vinny

# speaker: 阿城
辉哥，我有件事要告诉你。我们的人里面，可能有内鬼。

# speaker: 陈文辉
你有证据？

# speaker: 阿城
没有确凿的证据。但刀疤——邓威请来的杀手——暗示过叛徒就在您身边。

# speaker: 陈文辉
我知道啦。你先出去。

~ setFlag("warned_vinny", true)

-> chapter5_end

= investigate_solo

# speaker: 阿城
我决定自己找出叛徒。

# speaker: 阿城
突袭前的最后几个小时，我暗中监视着辉哥手下的每一个人。

# speaker: 阿城
终于，我看到了——铁手在突袭前一小时，偷偷离开了营地，朝邓威的方向走去。

~ knows_traitor = true
~ traitor_identity = "iron_fist"
~ setFlag("discovered_traitor_iron_fist", true)

# speaker: 阿城
铁手就是叛徒。

-> chapter5_end

= consult_hua

# speaker: 阿城
华哥，辉哥身边可能有内鬼。你知道些什么吗？

# speaker: 华哥
我早就怀疑了。阿城，你要小心铁手。

# speaker: 阿城
铁手？

# speaker: 华哥
佢最近嘅行为好反常。以前佢从嚟唔会单独行动，但系最近佢经常一个人消失。

# speaker: 华哥
而且……邓威嘅人好像总系知道辉哥嘅行动计划。

~ knows_traitor = true
~ traitor_identity = "iron_fist"
~ setFlag("hua_revealed_traitor", true)

# speaker: 阿城
铁手……真的是他。

-> chapter5_end

// ==================== Scene 6: 第五章结束 ====================
=== chapter5_end ===

~ setFlag("chapter5_complete", true)

# speaker: 阿城
那一夜，我没有合眼。明天的突袭，将决定城寨的命运。

# speaker: 阿城
而我知道一个可能改变一切的秘密。

{knows_traitor:
- 铁手是叛徒。如果我能在关键时刻揭露他……
- else: 叛徒是谁？我还不确定。但我必须在明天的战斗中保持警惕。
}

# speaker: 阿城
天亮了。最终的对决即将到来。

-> END
