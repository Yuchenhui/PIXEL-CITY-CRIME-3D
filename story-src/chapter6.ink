// ============================================================
// 第六章：最终对决 (Final Showdown)
// 三方势力最终对决，多种结局
// ============================================================

EXTERNAL giveMoney(amount)
EXTERNAL setFlag(key, value)
EXTERNAL spawnEnemies(count, type)
EXTERNAL updateWanted(change)

VAR trust_vinny = 0
VAR trust_tang = 0
VAR is_informant = false
VAR evidence_collected = false
VAR knows_traitor = false
VAR sided_with_vinny = false
VAR sided_with_tang = false
VAR sided_with_police = false

-> final_showdown_start

// ==================== Scene 1: 最终对决开始 ====================
=== final_showdown_start ===

# speaker: 阿城
（城寨的天空被浓烟染成了灰色。枪声从四面八方传来。）

# speaker: 阿城
（辉哥的突袭行动，从一开始就是一个陷阱。）

# speaker: 阿城
（邓威的人早已埋伏好了。辉哥的队伍被打得七零八落。）

# speaker: 陈文辉
（满身是血，被铁手和几个残部护在中间）

# speaker: 陈文辉
点解会咁？！边个出卖咗我？！

# speaker: 阿城
（看着混乱的战场，我知道，现在是我做最后选择的时候了。）

-> choose_side

// ==================== Scene 2: 选择阵营 ====================
=== choose_side ===

# speaker: 阿城
（三条路摆在我面前。）

* {sided_with_vinny || !sided_with_tang} [站在辉哥一边] -> side_with_vinny
* {sided_with_tang || !sided_with_vinny} [站在邓威一边] -> side_with_tang
* {is_informant} [联系黄志诚，让警察介入] -> side_with_police
* [独自逃走] -> escape_alone

// ==================== Ending A: 辉哥阵营 ====================
=== side_with_vinny ===

~ sided_with_vinny = true
~ setFlag("final_side_vinny", true)

# speaker: 阿城
辉哥！我来了！

# speaker: 陈文辉
阿城！好嘢！

# speaker: 阿城
辉哥，铁手是叛徒！他出卖了我们！

# speaker: 陈文辉
（震惊地看着铁手）铁手……你……

# speaker: 铁手
（冷笑）辉哥，时代变啦。你太老啦。

# speaker: 铁手
邓威答应我，只要佢赢咗，城寨东边就系我嘅。

# speaker: 陈文辉
（愤怒地）我当你就系兄弟！你点解要出卖我？！

# speaker: 铁手
兄弟？你从来都只当我系条狗！

~ spawnEnemies(8, "gang")

# speaker: 铁手
（拔出枪）辉哥，你嘅时代结束啦。

* [保护辉哥，反击铁手] -> protect_vinny
* [试图说服铁手] -> persuade_iron_fist

= protect_vinny

# speaker: 阿城
辉哥，趴下！

# speaker: 阿城
（我拔出枪，朝铁手开火！）

~ updateWanted(2)

# speaker: 阿城
（枪战爆发。辉哥的残部和邓威的人在巷子里混战。）

# speaker: 阿城
（铁手中了几枪，但没有倒下。他像一头受伤的野兽一样疯狂反击。）

# speaker: 铁手
阿城！你坏我好事！

# speaker: 阿城
（我瞄准铁手，扣下扳机。）

# speaker: 铁手
（子弹击中了他的胸口。铁手踉跄了几步，倒在地上。）

# speaker: 陈文辉
（走到铁手面前）铁手……你点解要咁做？

# speaker: 铁手
（嘴里涌出血来）辉哥……我恨你……从第一天起……

# speaker: 铁手
（闭上了眼睛。）

# speaker: 陈文辉
（沉默了很久）

# speaker: 陈文辉
阿城，多谢你。

# speaker: 陈文辉
从今日起，你就系我嘅兄弟。

~ giveMoney(5000)
~ setFlag("vinny_won", true)

-> ending_vinny

= persuade_iron_fist

# speaker: 阿城
铁手！你想想，邓威真的会信守承诺吗？

# speaker: 铁手
（犹豫了一下）你讲咩？

# speaker: 阿城
邓威利用完你，就会像丢垃圾一样丢掉你。你以为他会分地盘给你？

# speaker: 铁手
你呃我！

# speaker: 阿城
我没有骗你。你看看邓威的过去——他背叛了多少人？

# speaker: 铁手
（动摇了）我……

# speaker: 邓威
（远处传来声音）铁手！做咩仲唔动手？！

# speaker: 铁手
（看了看邓威，又看了看辉哥）

# speaker: 铁手
（最终，他放下了枪。）

# speaker: 铁手
辉哥……对唔住。

# speaker: 陈文辉
（走上前，拍了拍铁手的肩膀）回头是岸。

~ setFlag("iron_fist_surrendered", true)
~ giveMoney(3000)

-> ending_vinny

// ==================== Ending B: 辉哥胜利结局 ====================
=== ending_vinny ===

# speaker: 阿城
（邓威失去了铁手这个内应，攻势被瓦解了。）

# speaker: 阿城
（辉哥重新控制了城寨。但这场战争的代价是惨重的。）

# speaker: 陈文辉
阿城，你跟咗我之后，做嘅嘢我都睇到。

# speaker: 陈文辉
你系一个可靠嘅人。以后城寨嘅事，我哋一齐管。

# speaker: 阿城
（我站在辉哥身边，看着满目疮痍的城寨。）

# speaker: 阿城
（赢了。但这真的是我想要的吗？）

# speaker: 阿城
（城寨还是那个城寨。毒品、赌博、暴力……什么都没有改变。）

# speaker: 阿城
（只是，坐庄的人换了而已。）

~ setFlag("ending_vinny", true)

-> END

// ==================== Ending C: 邓威阵营 ====================
=== side_with_tang ===

~ sided_with_tang = true
~ setFlag("final_side_tang", true)

# speaker: 阿城
（我穿过枪林弹雨，找到了邓威。）

# speaker: 邓威
阿城！你选咗正确嘅一边！

# speaker: 阿城
邓老板，辉哥已经撑不住了。

# speaker: 邓威
好！今日之后，城寨就系我嘅！

# speaker: 阿城
（邓威带着人冲向辉哥的最后据点。）

# speaker: 阿城
（辉哥被逼到了绝路。他满身是血，眼神里满是不甘。）

# speaker: 陈文辉
阿城……连你都出卖我？

# speaker: 阿城
辉哥……对不起。

# speaker: 陈文辉
（笑了笑，笑容里满是苦涩）呵……我真系老啦。连边个信得过都睇唔出。

# speaker: 邓威
陈文辉，你嘅时代结束啦。

# speaker: 陈文辉
邓威，你以为你赢咗？城寨呢个地方……会吞噬所有人。

# speaker: 阿城
（辉哥倒下了。邓威的人欢呼起来。）

~ spawnEnemies(5, "gang")
~ giveMoney(10000)
~ setFlag("tang_won", true)

-> ending_tang

// ==================== Ending D: 邓威胜利结局 ====================
=== ending_tang ===

# speaker: 阿城
（邓威控制了城寨。但他的统治比辉哥更加残暴。）

# speaker: 阿城
（毒品更加泛滥，暴力更加频繁。城寨的居民生活在恐惧之中。）

# speaker: 邓威
阿城，你做得好。从今日起，你就系我嘅左右手。

# speaker: 阿城
多谢邓老板。

# speaker: 阿城
（我站在邓威身边，权力和金钱唾手可得。）

# speaker: 阿城
（但每天夜里，我都会想起辉哥最后的那个笑容。）

# speaker: 阿城
（城寨的高墙，不只是困住了城寨里的人。也困住了我。）

~ setFlag("ending_tang", true)

-> END

// ==================== Ending E: 警察介入 ====================
=== side_with_police ===

~ sided_with_police = true
~ setFlag("final_side_police", true)

# speaker: 阿城
（趁着混战，我悄悄拨通了黄志诚的电话。）

# speaker: 阿城
黄Sir，时机到了。城寨里的两帮人在火拼。

# speaker: 黄志诚
（电话那头）好！我马上调人。你帮我睇住现场。

# speaker: 阿城
（几分钟后，大批警察涌入城寨。）

# speaker: 警察
全部人唔好动！放低武器！

# speaker: 陈文辉
（震惊）差人？！

# speaker: 邓威
（愤怒）边个报嘅警？！

# speaker: 阿城
（我站在人群中间，看着辉哥和邓威被铐上手铐。）

# speaker: 黄志诚
（走到阿城身边）做得好。

# speaker: 阿城
黄Sir，你答应过我的——帮我离开香港。

# speaker: 黄志诚
（笑了笑）阿城，你以为我真系会放你走？

# speaker: 阿城
什么？

# speaker: 黄志诚
你知道嘅太多啦。我点可能放你走？

~ spawnEnemies(4, "police")

* [反抗] -> fight_wong
* [接受命运] -> accept_fate
* [拿出证据威胁黄志诚] -> threaten_wong

= fight_wong

# speaker: 阿城
（我早料到黄志诚会过河拆桥。）

# speaker: 阿城
（我拔出枪，朝黄志诚的人开火！）

~ updateWanted(3)

# speaker: 阿城
（在混乱中，我逃出了城寨。但代价是——我成了全港通缉犯。）

~ setFlag("fought_wong", true)

-> ending_fugitive

= accept_fate

# speaker: 阿城
（我放下了枪。我太累了。）

# speaker: 黄志诚
聪明嘅选择。

# speaker: 阿城
（我被铐上了手铐。辉哥、邓威、我——所有人都成了黄志诚的功劳。）

~ setFlag("arrested", true)

-> ending_arrested

= threaten_wong

# speaker: 阿城
黄Sir，你忘了一件事。

# speaker: 阿城
（拿出陈雪儿给我的那份证据）你的交易记录，在我手上。

# speaker: 黄志诚
（脸色大变）你……

# speaker: 阿城
如果你不放我走，这份证据就会出现在廉政公署的桌上。

# speaker: 黄志诚
（咬牙切齿）你……

# speaker: 陈雪儿
（突然出现）黄志诚！你被捕了！

# speaker: 黄志诚
陈雪儿？！你……

# speaker: 陈雪儿
我早就喺度查你啦。黄志诚，你有权保持沉默……

# speaker: 阿城
（看着黄志诚被铐上手铐，我长出了一口气。）

~ setFlag("wong_arrested", true)
~ giveMoney(5000)

-> ending_justice

// ==================== Ending F: 独自逃走 ====================
=== escape_alone ===

~ setFlag("final_escape_alone", true)

# speaker: 阿城
（够了。这一切，我受够了。）

# speaker: 阿城
（我没有选择任何一边。我转身，朝着城寨的出口跑去。）

# speaker: 阿城
（身后是枪声、惨叫声、爆炸声。但我没有回头。）

# speaker: 阿城
（我跑出了城寨，跑进了香港的夜色中。）

# speaker: 阿城
（我不知道自己要去哪里。但至少，我还活着。）

~ setFlag("ending_escape", true)

-> ending_wanderer

// ==================== Ending G: 逃亡者结局 ====================
=== ending_fugitive ===

# speaker: 阿城
（我成了香港的通缉犯。没有身份证，没有钱，没有朋友。）

# speaker: 阿城
（我又回到了起点——像当初偷渡来港时一样，一无所有。）

# speaker: 阿城
（但至少，我还活着。）

# speaker: 阿城
（也许有一天，我会找到一个新的地方，重新开始。）

# speaker: 阿城
（也许。）

~ setFlag("ending_fugitive", true)

-> END

// ==================== Ending H: 入狱结局 ====================
=== ending_arrested ===

# speaker: 阿城
（我被关进了监狱。辉哥、邓威、铁手——所有人都在里面。）

# speaker: 阿城
（城寨的故事，对我来说，结束了。）

# speaker: 阿城
（但在监狱里，我遇到了很多和我一样的人——从大陆偷渡来港，为了生存误入歧途。）

# speaker: 阿城
（也许，这就是城寨的宿命。一个吞噬所有人的地方。）

~ setFlag("ending_arrested", true)

-> END

// ==================== Ending I: 正义结局 ====================
=== ending_justice ===

# speaker: 阿城
（黄志诚被逮捕了。辉哥和邓威也被绳之以法。）

# speaker: 陈雪儿
阿城，多谢你。没有你，我哋唔可能搵到证据。

# speaker: 阿城
陈督察，城寨以后会变成点？

# speaker: 陈雪儿
（看着城寨的方向）迟早有一日，呢度会被拆卸。但系而家……

# speaker: 陈雪儿
我哋已经尽力啦。

# speaker: 阿城
（我站在城寨的入口，看着这个困住了无数人的地方。）

# speaker: 阿城
（也许，这就是我来香港的意义——不是为了发财，不是为了权力。）

# speaker: 阿城
（而是为了，让这个地方的故事，能有一个不同的结局。）

~ setFlag("ending_justice", true)

-> END

// ==================== Ending J: 流浪者结局 ====================
=== ending_wanderer ===

# speaker: 阿城
（我离开了城寨，离开了香港。）

# speaker: 阿城
（带着一身伤疤和满脑子的记忆，我坐上了返回大陆的船。）

# speaker: 阿城
（九龙城寨，那个困住了无数人的地方。）

# speaker: 阿城
（我不属于那里。也许，我哪里都不属于。）

# speaker: 阿城
（但至少，我还活着。我还年轻。）

# speaker: 阿城
（故事还没有结束。）

~ setFlag("ending_wanderer", true)

-> END
