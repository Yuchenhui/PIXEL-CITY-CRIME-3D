// ============================================================
// 第四章：腐败警察 (Corrupt Police)
// 黄志诚登场，陈雪儿调查，阿城面临选边
// ============================================================

EXTERNAL giveMoney(amount)
EXTERNAL setFlag(key, value)
EXTERNAL spawnEnemies(count, type)
EXTERNAL updateWanted(change)

VAR met_inspector_wong = false
VAR met_detective_chen = false
VAR is_informant = false
VAR evidence_collected = false
VAR trust_vinny = 0
VAR trust_tang = 0

-> corrupt_cop_intro

// ==================== Scene 1: 黄志诚登场 ====================
=== corrupt_cop_intro ===

# speaker: 阿城
城寨的日子一天比一天紧张。辉哥和邓威的冲突已经到了白热化。

# speaker: 阿城
但还有另一种势力在暗中操控一切——警察。

# speaker: 阿城
一天夜里，我被一个陌生人拦住了。

# speaker: 黄志诚
阿城先生？麻烦跟我走一趟。

# speaker: 阿城
你是谁？

# speaker: 黄志诚
黄志诚，港岛重案组。

# speaker: 阿城
警察。我下意识地想跑。

# speaker: 黄志诚
唔使紧张。我唔系嚟捉你嘅。

# speaker: 黄志诚
相反，我系嚟帮你嘅。

* [跟他走] -> go_with_wong
* [拒绝并离开] -> refuse_wong
* [问他想要什么] -> ask_wong_what

= go_with_wong

# speaker: 阿城
好，我跟你走。

# speaker: 黄志诚
跟我行，我同你慢慢讲。

~ met_inspector_wong = true
~ setFlag("met_inspector_wong", true)

-> wong_proposal

= refuse_wong

# speaker: 阿城
对不起，我没什么跟你谈的。

# speaker: 黄志诚
阿城，你喺城寨做嘅嘢，我全部知道。

# speaker: 黄志诚
帮陈文辉送货？同邓威做交易？你以为冇人睇到？

# speaker: 阿城
我心里一沉。

# speaker: 黄志诚
我再讲一次——跟我行。否则我就要公事公办啦。

~ updateWanted(1)

* [只能跟他走] -> go_with_wong
* [赌他不敢在城寨动手] -> call_bluff

= call_bluff

# speaker: 阿城
黄Sir，这里是城寨。你的手伸不进来。

# speaker: 黄志诚
你以为城寨系法外之地？

# speaker: 黄志诚
后生仔，你低估咗我。

* [屈服] -> go_with_wong
* [跑] -> run_from_wong

= run_from_wong

# speaker: 阿城
我转身就跑！

~ updateWanted(2)
~ spawnEnemies(4, "police")

# speaker: 黄志诚
追住佢！

# speaker: 阿城
我在巷子里狂奔，身后是追赶的脚步声。最终我甩掉了他们。

~ setFlag("fled_from_wong", true)

-> chapter4_continue

= ask_wong_what

# speaker: 阿城
黄Sir，你想从我这里得到什么？

# speaker: 黄志诚
聪明。我就钟意同聪明人倾嘢。

~ met_inspector_wong = true
~ setFlag("met_inspector_wong", true)

-> wong_proposal

// ==================== Scene 2: 黄志诚的提议 ====================
=== wong_proposal ===

# speaker: 黄志诚
阿城，我知道你喺城寨嘅处境。

# speaker: 黄志诚
陈文辉利用你，邓威想拉拢你。你两边都唔系自己人。

# speaker: 黄志诚
我可以帮你。

# speaker: 阿城
怎么帮？

# speaker: 黄志诚
做我嘅线人。提供陈文辉同邓威嘅情报。

# speaker: 黄志诚
作为回报，我保证你嘅安全。

* [答应做线人] -> become_informant
* [拒绝] -> refuse_informant
* [提出条件] -> negotiate

= become_informant

# speaker: 阿城
好，我做你的线人。

# speaker: 黄志诚
明智嘅选择。

~ is_informant = true
~ setFlag("is_informant", true)
~ giveMoney(1000)

# speaker: 黄志诚
呢啲钱你先攞住。有消息就打呢个电话搵我。

# speaker: 黄志诚
记住，唔好俾人知道你同我嘅关系。

-> chapter4_continue

= refuse_informant

# speaker: 阿城
黄Sir，对不起。我不会做线人。

# speaker: 黄志诚
你确定？

# speaker: 阿城
我确定。我不想出卖任何人。

# speaker: 黄志诚
好。有骨气。但冇我嘅保护，喺城寨你活唔到最后。

~ setFlag("refused_wong", true)

-> chapter4_continue

= negotiate

# speaker: 阿城
黄Sir，我可以帮你。但我有条件。

# speaker: 黄志诚
讲。

# speaker: 阿城
第一，保证我的安全。第二，如果事情败露，帮我离开香港。

# speaker: 黄志诚
得。我答应你。

~ is_informant = true
~ setFlag("is_informant", true)
~ setFlag("wong_agreed_terms", true)
~ giveMoney(1000)

# speaker: 黄志诚
成交。记住，唔好令我失望。

-> chapter4_continue

// ==================== Scene 3: 遇见陈雪儿 ====================
=== chapter4_continue ===

# speaker: 阿城
城寨的日子继续着。但我开始注意到一个人。

# speaker: 阿城
一个年轻的女人，总是在城寨附近徘徊。她穿着整洁，眼神锐利。

# speaker: 陈雪儿
等等。

# speaker: 阿城
你是谁？

# speaker: 陈雪儿
陈雪儿，重案组督察。

# speaker: 阿城
又一个警察。

# speaker: 陈雪儿
唔使紧张。我唔系嚟捉你嘅。我系嚟调查黄志诚嘅。

~ met_detective_chen = true
~ setFlag("met_detective_chen", true)

# speaker: 阿城
调查黄Sir？

# speaker: 陈雪儿
佢系腐败警察。收咗三合会嘅钱，为佢哋提供保护伞。

# speaker: 陈雪儿
我需要证据。你喺城寨入面，应该可以帮我。

* [答应帮陈雪儿] -> help_chen
* [拒绝] -> refuse_chen
* [告诉她自己是黄志诚的线人] -> confess_to_chen

= help_chen

# speaker: 阿城
好，我帮你。黄志诚不是什么好人。

# speaker: 陈雪儿
多谢你。

# speaker: 陈雪儿
我需要黄志诚同三合会嘅交易记录。佢应该有本笔记本，记低咗所有嘅交易。

~ setFlag("helping_chen", true)

# speaker: 陈雪儿
如果你可以攞到嗰本笔记本，我就可以将佢绳之以法。

-> chapter4_mission

= refuse_chen

# speaker: 阿城
对不起，我不想卷入警察之间的事。

# speaker: 陈雪儿
我明白。但系你要小心黄志诚。佢唔系好人。

~ setFlag("refused_chen", true)

-> chapter4_mission

= confess_to_chen

# speaker: 阿城
陈督察，我要告诉你一件事。我……是黄志诚的线人。

# speaker: 陈雪儿
你……

# speaker: 阿城
但我不想再做下去了。黄志诚不是好人。

# speaker: 陈雪儿
好。我信你。如果你帮我搵到证据，我保证你嘅安全。

~ setFlag("confessed_to_chen", true)
~ setFlag("helping_chen", true)

-> chapter4_mission

// ==================== Scene 4: 取证任务 ====================
=== chapter4_mission ===

# speaker: 阿城
陈雪儿告诉我，黄志诚的证据藏在城寨边缘的一个废弃警署里。

# speaker: 阿城
那里已经被三合会改造成了一个秘密据点。

# speaker: 陈雪儿
黄志诚嘅笔记本就喺嗰度嘅保险箱入面。密码系佢嘅警号——1997。

# speaker: 阿城
我深吸一口气。这可能是我做过最危险的事。

* [去取证据] -> go_get_evidence
* [放弃] -> give_up_evidence

= go_get_evidence

# speaker: 阿城
好，我去做。

~ spawnEnemies(3, "gang")

# speaker: 阿城
夜里，我潜入了废弃警署。里面有几个三合会的人在看守。

# speaker: 阿城
我小心翼翼地绕过了他们，找到了保险箱。

# speaker: 阿城
1……9……9……7……

# speaker: 阿城
保险箱打开了。里面有一本笔记本和几份文件。

# speaker: 阿城
我翻开笔记本——上面密密麻麻地记着黄志诚和三合会的每一笔交易。

# speaker: 阿城
时间、地点、金额、涉及的人物……全部清清楚楚。

~ evidence_collected = true
~ setFlag("evidence_collected", true)

# speaker: 阿城
拿到了。我小心翼翼地把证据藏好，准备离开。

# speaker: 三合会守卫
喂！边个喺度！

~ spawnEnemies(2, "gang")

# speaker: 阿城
糟了，被发现了！

* [战斗突围] -> fight_out
* [寻找另一条路] -> find_exit

= fight_out

# speaker: 阿城
我拔出手枪，朝守卫开火！

~ updateWanted(1)

# speaker: 阿城
枪声在空旷的建筑里回响。我边打边退，终于冲出了大门。

-> evidence_aftermath

= find_exit

# speaker: 阿城
我记得小鱼说过，城寨的每栋建筑都有秘密通道。

# speaker: 阿城
我在墙上摸索，找到了一个暗门。穿过狭窄的通道，我成功逃了出来。

-> evidence_aftermath

= give_up_evidence

# speaker: 阿城
对不起，陈督察。这个太危险了。

# speaker: 陈雪儿
我明白。唔怪得你。

~ setFlag("gave_up_evidence", true)

-> evidence_aftermath

// ==================== Scene 5: 取证后果 ====================
=== evidence_aftermath ===

~ setFlag("chapter4_complete", true)

# speaker: 阿城
那一夜之后，城寨的权力格局开始发生微妙的变化。

{evidence_collected:
- 我拿到了黄志诚的证据。现在关键是怎么使用它——交给陈雪儿，还是自己留着当筹码？
- else: 没有证据，黄志诚依然逍遥法外。而陈雪儿的调查陷入了僵局。
}

# speaker: 阿城
更大的风暴正在酝酿。辉哥和邓威的最终对决，已经不可避免。

-> END
