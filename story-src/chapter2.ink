// ============================================================
// 第二章：帮派初遇 (First Contact with Triads)
// 阿城在华哥茶餐厅安顿，初见陈文辉，接到第一个任务
// ============================================================

EXTERNAL giveMoney(amount)
EXTERNAL setFlag(key, value)
EXTERNAL spawnEnemies(count, type)
EXTERNAL updateWanted(change)

VAR met_vinny = false
VAR accepted_vinny_job = false
VAR met_boss_tang = false
VAR trust_vinny = 0
VAR trust_tang = 0

-> hua_restaurant

// ==================== Scene 1: 华哥茶餐厅 ====================
=== hua_restaurant ===

# speaker: 阿城
（茶餐厅里只有几张桌子，但收拾得干干净净。）

# speaker: 华哥
新面孔。坐，要食啲咩？

# speaker: 阿城
一杯奶茶，谢谢。

# speaker: 华哥
（倒了一杯热奶茶推过来）你系阿城？小鱼同我讲咗你嘅事。

# speaker: 阿城
华哥，谢谢你收留我。

# speaker: 华哥
唔使客气。我以前都系一样嘅情况过嚟嘅。

# speaker: 华哥
不过我要提醒你——城寨唔系普通地方。喺呢度，一步行错就冇回头。

# speaker: 阿城
我知道。我已经没有退路了。

# speaker: 华哥
（叹了口气）后生仔，每个入城寨嘅人都话冇退路。但系你要记住，退路系自己留嘅。

* [问华哥城寨的情况] -> ask_hua_about_city
* [问华哥为什么退出江湖] -> ask_hua_past
* [问有没有工作介绍] -> ask_hua_work

= ask_hua_about_city

# speaker: 阿城
华哥，你能给我说说城寨的情况吗？

# speaker: 华哥
城寨主要由两股势力控制。陈文辉——人称辉哥——控制东边。

# speaker: 华哥
佢表面上做赌档生意，实际上……

# speaker: 华哥
（压低声音）控制住成个港岛嘅白粉生意。

# speaker: 华哥
西边系邓威。金三角嚟嘅毒枭，一直想吞辉哥嘅地盘。

# speaker: 华哥
最近两边嘅人冲突越嚟越多，迟早要出大事。

~ setFlag("hua_explained_city", true)

-> vinny_arrives

= ask_hua_past

# speaker: 阿城
华哥，你以前是三合会的二把手，为什么要退出？

# speaker: 华哥
（沉默了好一会儿）

# speaker: 华哥
因为我见过太多嘅人死。有啲系我兄弟，有啲……

# speaker: 华哥
有啲系我亲手送佢哋走嘅。

# speaker: 华哥
我唔想再过咁嘅日子。一杯奶茶，几碟点心，呢种日子先系人过嘅。

~ setFlag("hua_told_past", true)

-> vinny_arrives

= ask_hua_work

# speaker: 阿城
华哥，有没有什么工作可以介绍？我需要赚钱活下去。

# speaker: 华哥
工作？城寨入面嘅工作……你知唔知大多都系咩性质嘅？

# speaker: 阿城
我……我不在乎。只要能活下去。

# speaker: 华哥
（看着我，眼神复杂）你讲嘅嘢同我当年一模一样。

# speaker: 华哥
我可以帮你留意下。不过你要小心，城寨入面嘅「工作」往往同三合会脱唔到关系。

~ setFlag("hua_will_help_find_work", true)

-> vinny_arrives

// ==================== Scene 2: 辉哥登场 ====================
=== vinny_arrives ===

# speaker: 华哥
（突然表情一变，压低声音）

# speaker: 华哥
唔好出声。有人入嚟咗。

# speaker: 阿城
（门被推开，走进来一个穿着西装的中年男人。身后跟着两个保镖。）

# speaker: 华哥
辉哥。今日吹咩风？

# speaker: 陈文辉
华哥，好久不见。我听说你呢度收留咗个新人？

# speaker: 华哥
（不动声色）小鱼带来嘅朋友，暂时借住一下。

# speaker: 陈文辉
（打量着阿城）你就系阿城？

# speaker: 阿城
（紧张地点了点头）辉……辉哥。

# speaker: 铁手
（从陈文辉身后走出来）就系佢。我喺巷子入面撞到嘅。

~ met_vinny = true
~ setFlag("met_vinny", true)

# speaker: 陈文辉
铁手话你想入伙？

# speaker: 阿城
（我看了华哥一眼，华哥微微摇头，但没有说话。）

* [说想加入] -> agree_join_vinny
* [说只想找份正经工作] -> refuse_politely
* [保持沉默] -> stay_silent

= agree_join_vinny

# speaker: 阿城
是的，辉哥。我什么都肯做。

# speaker: 陈文辉
（笑了）好。有胆量。我最钟意有胆量嘅年轻人。

~ trust_vinny = trust_vinny + 2
~ accepted_vinny_job = true

# speaker: 陈文辉
咁我俾个机会你。帮我送个包裹去安全屋。

# speaker: 陈文辉
做好咗，以后你就系我嘅人。

~ setFlag("accepted_vinny_job", true)

-> vinny_mission

= refuse_politely

# speaker: 阿城
辉哥，我……我只是想找一份正当的工作。

# speaker: 陈文辉
（笑容消失）正当工作？喺城寨，正当工作？

# speaker: 陈文辉
后生仔，你知唔知城寨入面边个交保护费？边个做黄赌毒？全部人。

# speaker: 华哥
辉哥，佢新嚟嘅，唔识规矩。

# speaker: 陈文辉
（看了华哥一眼）华哥，你唔好再护住啲细路啦。

# speaker: 陈文辉
（转向阿城）我今日俾面华哥。但系你要记住，喺城寨，冇人可以中立。

~ trust_vinny = trust_vinny - 1
~ setFlag("refused_vinny_politely", true)

-> vinny_mission

= stay_silent

# speaker: 阿城
（我只是低着头，不说话。）

# speaker: 陈文辉
（等了一会儿）唔出声？

# speaker: 铁手
辉哥，呢个人有古怪。不如我……

# speaker: 陈文辉
（抬手制止）唔使。沉默嘅人有两种——要么系怕事，要么系有嘢收埋。

# speaker: 陈文辉
我倒要睇下你系边种。

~ setFlag("stayed_silent_with_vinny", true)

-> vinny_mission

// ==================== Scene 3: 辉哥的任务 ====================
=== vinny_mission ===

# speaker: 陈文辉
听住。我有个包裹要送去城寨西边嘅安全屋。

# speaker: 陈文辉
最近邓威嘅人四处搵事，我唔想派自己嘅人过去打草惊蛇。

# speaker: 陈文辉
你系生面孔，冇人识你。送个包裹，做完返嚟搵我。

* [接下任务] -> accept_mission
* [问包裹里是什么] -> ask_about_package
* [拒绝] -> refuse_mission

= accept_mission

# speaker: 阿城
好，我去做。

# speaker: 陈文辉
（满意地点点头）爽快。铁手，俾佢包裹。

# speaker: 铁手
（把一个牛皮纸包裹塞到阿城手里）小心啲，唔好搞烂咗。

~ giveMoney(500)
~ accepted_vinny_job = true
~ trust_vinny = trust_vinny + 1
~ setFlag("accepted_delivery_mission", true)

# speaker: 陈文辉
安全屋喺城寨西边第三条巷嘅地下室。敲三下门，停，再敲两下。

-> END

= ask_about_package

# speaker: 阿城
辉哥，这个包裹里是什么？

# speaker: 陈文辉
（脸色一沉）你问咁多做咩？

# speaker: 铁手
边个教你问大佬嘅嘢？

# speaker: 陈文辉
算啦。新嚟嘅唔识规矩。（转向阿城）记住，做嘢唔好问点解。明唔明白？

# speaker: 阿城
……明白。

~ trust_vinny = trust_vinny - 1

* [接下任务] -> accept_mission
* [拒绝] -> refuse_mission

= refuse_mission

# speaker: 阿城
辉哥，对不起，这个任务我做不了。

# speaker: 陈文辉
（冷笑一声）做不了？

# speaker: 铁手
你知唔知你拒绝嘅系边个？

# speaker: 陈文辉
算啦，铁手。（转向阿城）后生仔，我只讲一次——喺城寨，冇人可以拒绝我。

# speaker: 陈文辉
今日我唔为难你。但下次……你最好想清楚。

~ trust_vinny = trust_vinny - 2
~ setFlag("refused_vinny_mission", true)

# speaker: 华哥
（等陈文辉离开后）阿城，你做得啱。但系你要小心，辉哥唔系大方嘅人。

-> END

// ==================== Scene 4: 安全屋 ====================
=== deliver_package ===

# speaker: 阿城
（我拿着包裹，穿过城寨西边迷宫般的巷子。）

# speaker: 阿城
（西边比东边更加破旧，到处是废弃的房间和涂鸦。）

# speaker: 阿城
（找到了那条巷子，第三栋楼的地下室。我按照约定敲门。）

# speaker: 阿城
咚咚咚……停……咚咚。

# speaker: 神秘人
（门开了一条缝）包裹？

# speaker: 阿城
辉哥叫我送来的。

# speaker: 神秘人
（接过包裹，门又关上了。）

# speaker: 阿城
（任务完成了。但在转身离开的时候，我听到了包裹里传出的声音。）

# speaker: 阿城
（是塑料袋的声音。还有……一种奇怪的气味。）

# speaker: 阿城
（白粉。这里面装的是白粉。）

~ setFlag("delivered_package", true)
~ setFlag("knows_package_contents", true)

-> END
