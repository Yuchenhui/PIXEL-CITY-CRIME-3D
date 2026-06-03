// ============================================================
// 第三章：毒品交易 (Drug Deal)
// 阿城深入毒品交易，遇见邓威，权力斗争加剧
// ============================================================

EXTERNAL giveMoney(amount)
EXTERNAL setFlag(key, value)
EXTERNAL spawnEnemies(count, type)
EXTERNAL updateWanted(change)

VAR met_boss_tang = false
VAR sided_with_vinny = false
VAR sided_with_tang = false
VAR playing_both_sides = false
VAR trust_vinny = 0
VAR trust_tang = 0
VAR deal_survived = false

-> drug_trade_start

// ==================== Scene 1: 深入毒品世界 ====================
=== drug_trade_start ===

# speaker: 阿城
自从送了那个包裹之后，我在城寨的地位慢慢改变了。

# speaker: 阿城
辉哥开始信任我，让我参与更多的「生意」。

# speaker: 阿城
但我心里清楚，每送一次货，我就陷得更深。

# speaker: 小鱼
阿城，你最近做嘅嘢……

# speaker: 阿城
小鱼，我知道你想说什么。

# speaker: 小鱼
我唔想你变成阿辉阿辉嗰样。佢以前都系好人嚟嘅。

# speaker: 阿城
阿辉是谁？

# speaker: 小鱼
华哥以前嘅徒弟。而家变成咗瘾君子，日日喺街头流离浪荡。

~ setFlag("learned_about_ah_fai", true)

# speaker: 阿城
小鱼的话让我犹豫了。但我知道，在城寨，犹豫就是死。

# speaker: 阿城
很快，辉哥交给了我一个更重要的任务。

-> vinny_briefing

// ==================== Scene 2: 辉哥的命令 ====================
=== vinny_briefing ===

# speaker: 陈文辉
阿城，你做得唔错。而家有个更重要嘅任务。

# speaker: 陈文辉
邓威约我今晚喺码头交易。佢想买我嘅货。

# speaker: 陈文辉
但系我唔信佢。你代替我去，带住货，睇住佢哋有冇花样。

* [接受任务] -> accept_drug_deal
* [表示担忧] -> express_concern
* [拒绝参与] -> refuse_drug_deal

= accept_drug_deal

# speaker: 阿城
辉哥，我去做。

# speaker: 陈文辉
好。记住，见到邓威之后，唔好俾佢睇到你紧张。

~ trust_vinny = trust_vinny + 2
~ sided_with_vinny = true
~ setFlag("accepted_drug_deal", true)

# speaker: 陈文辉
我会喺附近安排人。如果出咗事，打烂个玻璃樽，我哋就冲入去。

-> prepare_for_deal

= express_concern

# speaker: 阿城
辉哥，这个交易会不会有危险？

# speaker: 陈文辉
有危险？喺城寨，日日都有危险。

# speaker: 阿城
我不怕死。我只是想知道，如果邓威搞花样怎么办。

# speaker: 陈文辉
好问题。所以我要你去。你系生面孔，佢哋唔会太提防你。

~ trust_vinny = trust_vinny + 1
~ sided_with_vinny = true
~ setFlag("accepted_drug_deal", true)

-> prepare_for_deal

= refuse_drug_deal

# speaker: 阿城
辉哥，对不起，我不想再做毒品生意了。

# speaker: 陈文辉
你讲咩？

# speaker: 铁手
你知唔知自己喺讲咩？入咗呢条路，边有得退？

# speaker: 陈文辉
阿城，我最后讲一次——冇人可以退出。

* [勉强答应] -> reluctant_agree
* [坚持拒绝] -> hard_refuse

= reluctant_agree

# speaker: 阿城
好，我去。

~ trust_vinny = trust_vinny - 1
~ sided_with_vinny = true
~ setFlag("reluctantly_accepted", true)

-> prepare_for_deal

= hard_refuse

# speaker: 阿城
对不起，辉哥。我真的不能做。

# speaker: 陈文辉
你走。但系你要记住，从今日起，你唔再系我嘅人。

~ setFlag("left_vinny", true)

-> meet_tang_independently

// ==================== Scene 3: 准备交易 ====================
=== prepare_for_deal ===

# speaker: 阿城
晚上，我带着货来到城寨边缘的废弃码头。

# speaker: 阿城
码头上只有几盏昏暗的灯光，空气中弥漫着海水的腥味。

# speaker: 阿城
我看到对面走来一群人。为首的是一个穿着白色唐装的中年男人。

-> tang_appears

// ==================== Scene 4: 邓威登场 ====================
=== tang_appears ===

# speaker: 邓威
你就系陈文辉派嚟嘅人？

# speaker: 阿城
是的，邓老板。

# speaker: 邓威
好年轻。陈文辉派个细路仔嚟，系唔系睇唔起我？

# speaker: 阿城
邓老板说笑了。辉哥说，生面孔更安全。

# speaker: 邓威
几识讲话。货呢？

# speaker: 阿城
在这里。

# speaker: 邓威嘅手下
邓哥，货冇问题。

~ met_boss_tang = true
~ setFlag("met_boss_tang", true)

# speaker: 邓威
好。钱喺度。

# speaker: 邓威
后生仔，我问你——你跟陈文辉几耐啦？

* [如实回答] -> honest_answer
* [含糊其辞] -> vague_answer
* [反问邓威] -> counter_question

= honest_answer

# speaker: 阿城
没多久，我是新来的。

# speaker: 邓威
新嚟嘅？陈文辉就派你嚟做大生意？

# speaker: 邓威
后生仔，你有冇谂过，佢点解要派你嚟？

~ trust_tang = trust_tang + 1

-> deal_continues

= vague_answer

# speaker: 阿城
跟了辉哥……有一段时间了。

# speaker: 邓威
唔肯讲真话？几醒目。

~ trust_tang = trust_tang - 1

-> deal_continues

= counter_question

# speaker: 阿城
邓老板，你为什么问这个？

# speaker: 邓威
有胆识！我喜欢。

# speaker: 邓威
因为我有嘢想同你讲。

~ trust_tang = trust_tang + 2

-> tang_offer

// ==================== Scene 5: 交易继续 ====================
=== deal_continues ===

# speaker: 邓威
后生仔，我讲啲嘢你听。

# speaker: 邓威
陈文辉控制城寨嘅日子唔长啦。

# speaker: 邓威
佢嘅人——有啲已经同我倾紧。

* [表示考虑] -> consider_tang
* [拒绝邓威] -> reject_tang
* [答应做双面间谍] -> double_agent

// ==================== Scene 6: 邓威的拉拢 ====================
=== tang_offer ===

# speaker: 邓威
后生仔，陈文辉迟早会倒台。佢太贪心，得罪嘅人太多。

# speaker: 邓威
你跟住佢，最后只会做替死鬼。

# speaker: 邓威
跟我做嘢，我保证你喺城寨嘅地位比跟住佢高十倍。

* [答应考虑] -> consider_tang
* [拒绝] -> reject_tang
* [做双面间谍] -> double_agent

// ==================== Branch: 考虑邓威 ====================
=== consider_tang ===

# speaker: 阿城
邓老板，容我考虑一下。

# speaker: 邓威
好。唔急。呢个系我嘅电话号码，想通咗就打俾我。

~ setFlag("tang_gave_number", true)
~ trust_tang = trust_tang + 1

-> deal_goes_wrong

// ==================== Branch: 拒绝邓威 ====================
=== reject_tang ===

# speaker: 阿城
邓老板，谢谢你的好意。但我是辉哥的人。

# speaker: 邓威
忠心？好。我钟意忠心嘅人。

# speaker: 邓威
但系你要记住——忠心唔代表安全。

~ trust_vinny = trust_vinny + 1

-> deal_goes_wrong

// ==================== Branch: 双面间谍 ====================
=== double_agent ===

# speaker: 阿城
邓老板，我可以帮你。但我有条件。

# speaker: 邓威
讲。

# speaker: 阿城
我要钱。还有，保证我的安全。

# speaker: 邓威
冇问题。合作愉快。

~ playing_both_sides = true
~ trust_tang = trust_tang + 2
~ setFlag("playing_both_sides", true)
~ giveMoney(1000)

-> deal_goes_wrong

// ==================== Scene 7: 交易出事 ====================
=== deal_goes_wrong ===

# speaker: 阿城
正当交易即将完成的时候，远处突然传来枪声。

# speaker: 邓威嘅手下
邓哥！有人嚟咗！

~ spawnEnemies(6, "gang")

# speaker: 邓威
陈文辉嘅人？定系……

# speaker: 阿城
混乱中，我看到一群人从黑暗中冲出来，不分青红皂白地开枪。

# speaker: 阿城
这不是辉哥的人。也不是邓威的人。是谁？

* [保护货款逃走] -> protect_money
* [帮助邓威反击] -> help_tang_fight
* [趁乱逃走] -> flee_chaos

= protect_money

# speaker: 阿城
我抓起手提箱，转身就跑！

~ updateWanted(2)

# speaker: 阿城
子弹在耳边呼啸而过。我拼命跑，躲进了一条小巷。

~ setFlag("stole_drug_money", true)

-> deal_aftermath

= help_tang_fight

# speaker: 阿城
我拔出手枪，和邓威的人一起还击。

~ spawnEnemies(3, "gang")
~ trust_tang = trust_tang + 2

# speaker: 邓威
好嘢！有胆识！

# speaker: 阿城
我们击退了袭击者，但邓威受了伤。

# speaker: 邓威
后生仔，我欠你一条命。

~ setFlag("saved_boss_tang", true)

-> deal_aftermath

= flee_chaos

# speaker: 阿城
趁着混乱，我丢下一切，拼命往城寨方向跑。

# speaker: 阿城
身后枪声不断，但我没有回头。

~ deal_survived = true
~ setFlag("fled_drug_deal", true)

-> deal_aftermath

// ==================== Scene 8: 独立遇见邓威 ====================
=== meet_tang_independently ===

# speaker: 阿城
离开了辉哥，我在城寨里变得无依无靠。

# speaker: 阿城
但很快，有人主动找到了我。

# speaker: 邓威嘅手下
你系阿城？我哋老板想见你。

# speaker: 邓威
听说你同陈文辉闹翻咗？

# speaker: 阿城
消息传得真快。

# speaker: 邓威
城寨入面冇秘密。后生仔，我睇得起你——敢同陈文辉讲「唔」嘅人唔多。

# speaker: 邓威
跟我做嘢。我保证你食得好，住得好。

* [答应加入邓威] -> join_tang
* [拒绝] -> reject_tang_independent

= join_tang

# speaker: 阿城
好，我跟你。

# speaker: 邓威
爽快！嚟，饮杯酒庆祝一下。

~ sided_with_tang = true
~ trust_tang = trust_tang + 3
~ setFlag("joined_boss_tang", true)
~ giveMoney(2000)

# speaker: 邓威
第一件事——我要你帮我监视陈文辉嘅一举一动。

-> END

= reject_tang_independent

# speaker: 阿城
邓老板，谢谢你。但我不想再卷入这些事了。

# speaker: 邓威
冇问题。但系你要记住，喺城寨，中立场嘅人死得最快。

~ setFlag("rejected_tang_independent", true)

-> END

// ==================== Scene 9: 交易后果 ====================
=== deal_aftermath ===

~ setFlag("chapter3_complete", true)

# speaker: 阿城
那一夜之后，城寨的局势彻底改变了。

# speaker: 阿城
辉哥和邓威之间的冲突越来越频繁，城寨里的每个人都被迫选边站。

{playing_both_sides:
- # speaker: 阿城
我在两个势力之间走钢丝，每一步都可能是最后一步。
}

{sided_with_vinny and not playing_both_sides:
- # speaker: 阿城
我已经选了辉哥这边。不管对错，只能走下去。
}

{sided_with_tang and not playing_both_sides:
- # speaker: 阿城
我跟了邓威。新的老板，新的规矩。
}

{not playing_both_sides and not sided_with_vinny and not sided_with_tang:
- # speaker: 阿城
我不属于任何一边。在城寨，这是最危险的位置。
}

-> END
