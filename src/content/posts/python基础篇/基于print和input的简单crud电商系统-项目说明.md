---
title:  基于print和input的简单 CRUD 电商系统
published: 2026-09-25
updated: 2026-09-25
description: 基础语法 Python实例
tags: ["项目实战"]
category: Python 学习
draft: false
lang: zh_CN
---

# 基于print和input的简单 CRUD 电商系统

## 1. 项目简介

这是一个使用 Python 标准输入输出实现的命令行电商系统。项目不依赖数据库、Web 框架或第三方库，用户通过终端菜单完成商品查询、商品维护、购买商品、查看订单和查看余额等操作。

项目的重点不在于模拟完整的线上商城，而在于用一个规模较小、容易运行和阅读的程序，练习以下基础能力：

- 使用字典、列表和集合组织业务数据；
- 使用函数拆分查询、维护和购买等功能；
- 使用 `input()` 接收用户输入，使用 `print()` 输出结果；
- 对数字、编号、库存和确认操作进行输入校验；
- 在内存中完成一套基本的 `CRUD（Create、Read、Update、Delete）`流程。

当前程序是一个单文件、内存型原型。程序退出后，新增商品、库存变化、余额变化和订单记录都会丢失。

## 2. 整体设计思路

### 2.1 先列出需要实现的功能:
===== zebrafishshop =====
1. 显示所有商品
2. 按编号查询商品
3. 新增商品
4. 修改商品
5. 删除商品
6. 查看购物车
7. 购买商品
8. 查看订单
9. 查看余额
0. 充值余额

以及退出



### 2.2 确定最小业务闭环

项目可以先拆成一个最小闭环：

1. 系统中预置几件商品；
2. 用户可以查看或按编号查询商品；
3. 用户可以新增、修改和删除商品；
4. 用户购买商品时检查商品、库存和余额；
5. 购买成功后同步扣减库存、扣减余额并生成订单；
6. 用户可以查看历史订单和当前余额。

这个顺序体现了从“商品数据”到“交易结果”的依赖关系。
只有商品存在，才能查询、修改；
只有库存和余额满足条件，才能完成购买；
购买成功后才能更改库存与余额信息，并留下订单记录。

### 2.3 采用内存数据结构降低复杂度

项目使用几种基础数据结构保存状态：

```python
productions = {
    "p001": {"name": "apple", "price": 300, "stock": 10},
    "p002": {"name": "milk", "price": 600, "stock": 5},
    "p003": {"name": "notebook", "price": 1250, "stock": 3},
}

wallet = 10000
order = []
id_next_order = 1
id_used_productions = set(productions)
```

- `productions` 是商品表，商品编号作为字典键，便于按照编号快速查找；
- 商品信息使用嵌套字典保存名称、价格和库存；
- `wallet` 保存账户余额；
- `order` 保存订单历史，每个订单使用一个字典表示；
- `id_next_order` 用于生成递增的订单编号；
- `id_used_productions` 记录曾经使用过的商品编号，防止删除商品后再次复用旧编号。

设计适合教学和练习。它的优点是结构直观、代码少；缺点是没有持久化、没有并发控制，也不适合真实业务规模。

### 2.4 金额使用“分”保存

程序不直接用浮点数保存价格，而是把金额统一保存为整数分。例如 `300` 表示 `3.00` 元，`1250` 表示 `12.50` 元。

```python
def money(cents):
    yuan = cents // 100
    fen = cents % 100
    return f"{yuan}.{fen:02d}元"
```

!这样做可以避免浮点数运算产生的精度误差。计算总价时直接使用整数乘法：

```python
total = production["price"] * quantity
```

只有在输出给用户时，才通过 `money()` 转换成元和分的显示格式。

## 3. 代码结构与各部分功能

虽然项目只有一个文件，但代码已经按照职责分成几个区域：辅助功能、查询功能、商品修改、购买系统和启动器。这样的划分为后续拆分成多个模块打下了基础。

### 3.1 辅助功能：统一处理输入和显示

#### `money(cents)`：格式化金额

负责把整数分转换成类似 `100.00元` 的文本。商品列表、订单详情、购买确认和余额查询都通过该函数输出金额，避免每个函数重复编写格式化逻辑。

#### `input_number(item, allowzero=False)`：读取正整数

这个函数集中处理数字输入：

- 输入无法转换为整数时，提示“请输入整数”；
- 默认要求输入大于 `0` 的整数；
- 当 `allowzero=True` 时允许输入 `0`，适合库存设置为零；
- 统一拒绝负数。

集中校验的好处是商品价格、库存和购买数量可以复用同一套规则，减少重复代码。

#### `ask_yes_no(item)`：处理确认操作

删除商品和购买商品都属于会修改数据的操作，因此程序要求用户输入 `y` 或 `n` 进行确认。函数使用循环持续询问，直到得到合法答案，并把结果转换成 `True` 或 `False`。

### 3.2 查询功能

#### `print_production(production_id)`：输出单个商品

该函数根据商品编号读取商品信息，并输出编号、名称、格式化价格和库存。当库存为 `0` 时，额外显示“缺货”。

#### `show_productions()`：显示全部商品

函数先处理商品为空的情况，再对商品编号排序后逐个调用 `print_production()`。排序可以让列表输出稳定，方便用户阅读和测试。

#### `find_production()`：按编号查询

函数读取商品编号，先检查编号是否存在于 `productions`。存在时输出商品详情，不存在时给出提示，不会直接访问不存在的字典键。

#### `show_order()`：显示订单历史

订单列表为空时显示“暂无订单”；有订单时，逐条输出订单编号、商品编号、商品名称、数量、单价和总额。订单中保存了购买时的商品名称和单价，因此即使商品之后被修改，历史订单仍然能够保留购买当时的信息。

### 3.3 商品 CRUD

CRUD 分别对应以下操作：

| 操作 | 函数 | 主要实现方式 |
| --- | --- | --- |
| Create 新增 | `add_production()` | 校验编号、名称、价格和库存后写入 `productions` |
| Read 查询 | `show_productions()`、`find_production()` | 遍历字典或按编号读取 |
| Update 修改 | `update_productions()` | 选择修改名称、价格或库存 |
| Delete 删除 | `del_production()` | 二次确认后从字典中删除 |

#### 新增商品

`add_production()` 在写入数据前会依次校验：

1. 商品编号长度必须为 4；
2. 编号首字符必须是 `p`；
3. 后三位必须是数字；
4. 编号不能出现在 `id_used_productions` 中；
5. 商品名称不能为空；
6. 价格必须是正整数；
7. 库存必须是非负整数。

只有全部校验通过后，函数才会同时更新 `productions` 和 `id_used_productions`。这体现了“校验完成后再写入”的思路，避免产生不完整商品。

#### 修改商品

`update_productions()` 先确认商品存在，然后提供三个修改分支：

- 修改商品名称，名称不能为空；
- 修改商品价格，必须输入正整数；
- 修改商品库存，允许设置为 `0`。

输入 `0` 可以取消修改，其他不存在的指令会被拒绝。

#### 删除商品

`del_production()` 删除前会先显示商品，并通过 `ask_yes_no()` 获取确认。删除操作只从 `productions` 中移除商品，不删除 `id_used_productions` 中的编号，因此已经使用过的编号不能再次注册。这是一种简单的历史编号约束。

### 3.4 购买流程

购买逻辑集中在 `buy()` 中，可以看作一个简化的交易事务：

```text
读取商品编号
    ↓
检查商品是否存在
    ↓
读取购买数量并检查数量是否合法
    ↓
检查库存是否足够
    ↓
计算总价并检查余额
    ↓
展示购买摘要，要求用户确认
    ↓
扣减库存、扣减余额、写入订单
```

具体实现包含几个重要细节：

1. 购买不存在的商品会立即结束；
2. 购买数量必须是正整数；
3. 购买数量不能超过当前库存；
4. 总价不能超过 `wallet`；
5. 用户未确认时，不修改库存、余额或订单；
6. 确认后一次性完成库存扣减、余额扣减和订单追加；
7. 订单保存购买时的商品编号、商品名称、单价、数量和总额；
8. 成功后递增 `id_next_order`，并显示订单编号、余额和剩余库存。

由于 `wallet` 和 `id_next_order` 在函数内部会被重新赋值，`buy()` 使用了 `global wallet, id_next_order`。这是单文件脚本中的直接做法；如果项目继续扩展，可以把账户和订单状态封装到类或服务对象中，减少对全局变量的依赖。

## 4. 菜单与程序入口

`show_menu()` 负责打印菜单，`main()` 负责持续读取指令并分派到具体函数。主循环的基本结构是：

```python
while True:
    show_menu()
    choice = input("选择功能：").strip()
    # 根据 choice 调用对应业务函数
```

用户输入 `e` 时退出循环；输入其他未定义指令时，程序提示重新输入。入口判断：

```python
if __name__ == "__main__":
    main()
```

保证了文件被直接运行时才启动交互菜单；如果以后把函数导入其他模块，也不会在导入时自动进入输入循环。

## 5. 当前菜单的实际实现状态

按照当前源代码，菜单映射如下：

| 输入 | 当前行为 |
| --- | --- |
| `1` | 显示所有商品 |
| `2` | 按编号查询商品 |
| `3` | 新增商品 |
| `4` | 修改商品 |
| `5` | 删除商品 |
| `6` | 计划用于查看购物车 |
| `7` | 购买商品 |
| `8` | 查看订单 |
| `9` | 查看余额 |
| `0` | 计划用于充值|
| `e` | 退出程序 |

## 6. 适合继续完善的方向

### 6.1 增加持久化

可以先使用 JSON 文件保存商品、余额和订单，再逐步升级到 SQLite。这样程序重启后仍能保留数据。持久化时需要考虑文件不存在、文件损坏和写入失败等异常情况。

### 6.2 拆分模块

当功能变多后，可以按职责拆分为：

```text
main.py       菜单和程序入口
models.py     商品、订单等数据结构
product.py    商品查询和 CRUD
order.py      购买和订单处理
utils.py      金额格式化和输入校验
storage.py    文件或数据库读写
```

### 6.3 增加购物车和充值

购物车可以使用字典保存“商品编号 -> 数量”，结算时统一检查库存和余额；充值功能则应校验金额为正数，并在确认后增加 `wallet`。如果要支持多个用户，还需要把余额从单个全局变量改成用户账户数据。


### 7. 完整代码案例：

```python
"""基于 print 和 input 的简单 CRUD 电商系统。"""

productions = {
    "p001": {"name": "apple", "price": 300, "stock": 10},
    "p002": {"name": "milk", "price": 600, "stock": 5},
    "p003": {"name": "notebook", "price": 1250, "stock": 3},
}
wallet = 10000
order = []
id_next_order = 1
id_used_productions = set(productions)

"""辅助功能"""


def money(cents):
    """把整数分转换成元的显示格式。"""
    yuan = cents // 100
    fen = cents % 100
    return f"{yuan}.{fen:02d}元"


def input_number(item, allowzero=False):
    """读取整数；allowzero=True 时允许输入 0。"""
    text = input(item).strip()
    try:
        number = int(text)
    except ValueError:
        print("请输入整数!")
        return None

    if allowzero:
        if number < 0:
            print("不能输入负数!")
            return None
    elif number <= 0:
        print("请输入大于 0 的整数!")
        return None
    return number


def ask_yes_no(item):
    """只接受 y 或 n，其他输入会重新询问。"""
    while True:
        answer = input(item).strip().lower()
        if answer == "y":
            return True
        if answer == "n":
            return False
        print("请输入 y 或 n。")


"""查询功能"""


def print_production(production_id):
    """打印一个已经存在的商品。"""
    production = productions[production_id]
    stock_text = str(production["stock"])
    if production["stock"] == 0:
        stock_text = stock_text + "（缺货）"
    print(
        f"{production_id} | {production['name']} | "
        f"{money(production['price'])} | 库存：{stock_text}"
    )


def show_productions():
    """显示所有商品。"""
    if not productions:
        print("当前尚无商品")
        return
    for production_id in sorted(productions):
        print_production(production_id)


def find_production():
    """按照编号查询商品。"""
    production_id = input("商品编号：").strip()
    if production_id not in productions:
        print("该商品不存在!")
        return
    print_production(production_id)


def show_order():
    """显示订单历史。"""
    if not order:
        print("暂无订单!")
        return
    for unit_order in order:
        print(
            f"订单{unit_order['id']} | {unit_order['product_id']} "
            f"{unit_order['product_name']} | 数量：{unit_order['quantity']} | "
            f"单价：{money(unit_order['unit_price'])} | "
            f"总额：{money(unit_order['total'])}"
        )


def show_menu():
    print("\n===== zebrafishshop =====")
    print("1. 显示所有商品")
    print("2. 按编号查询商品")
    print("3. 新增商品")
    print("4. 修改商品")
    print("5. 删除商品")
    print("6. 查看购物车")
    print("7. 购买商品")
    print("8. 查看订单")
    print("9. 查看余额")
    print("0. 余额充值")
    print("e. 退出")


"""商品修改"""


def add_production():
    """新增商品：全部验证成功后才写入字典。"""
    production_id = input("请输入商品编号：").strip()
    judgement = (
        len(production_id) == 4
        and production_id[0] == "p"
        and production_id[1:].isdigit()
        and production_id not in id_used_productions
    )
    if not judgement:
        print("请检查编号，\n确保其格式正确、曾经没有被使用过!")
        return

    name = input("请输入商品名称：").strip()
    if not name:
        print("商品名称不能为空!")
        return
    price = input_number("请输入商品价格（分）：")
    if price is None:
        return
    stock = input_number("请输入商品库存：", allowzero=True)
    if stock is None:
        return

    productions[production_id] = {"name": name, "price": price, "stock": stock}
    id_used_productions.add(production_id)
    print("商品新增成功!")


def update_productions():
    """修改商品名称、价格或库存。"""
    production_id = input("请输入要修改的商品编号：").strip()
    if production_id not in productions:
        print("该商品不存在!")
        return

    production = productions[production_id]
    print_production(production_id)
    print("1. 修改商品名称")
    print("2. 修改商品价格")
    print("3. 修改商品库存")
    print("0. 取消修改")
    choice = input("请选择：").strip()

    if choice == "1":
        name = input("请输入修改后的名称：").strip()
        if not name:
            print("名称不能为空，修改失败!")
            return
        production["name"] = name
    elif choice == "2":
        price = input_number("请输入修改后的价格（分）：")
        if price is None:
            return
        production["price"] = price
    elif choice == "3":
        stock = input_number("请输入修改后的库存：", allowzero=True)
        if stock is None:
            return
        production["stock"] = stock
    elif choice == "0":
        print("已取消修改。")
        return
    else:
        print("输入的指令不存在!")
        return
    print("商品修改成功!")


def del_production():
    """删除商品，但保留已使用编号记录。"""
    production_id = input("请输入要删除的商品编号：").strip()
    if production_id not in productions:
        print("该商品不存在!")
        return
    print_production(production_id)
    if not ask_yes_no("确认删除？y/n："):
        print("已取消删除。")
        return
    del productions[production_id]
    print("商品删除成功!")


"""购买系统"""


def buy():
    """购买一个商品；确认前不修改任何数据。"""
    global wallet, id_next_order
    production_id = input("请输入商品编号：").strip()
    if production_id not in productions:
        print("该商品不存在!")
        return
    production = productions[production_id]
    quantity = input_number("购买数量：")
    if quantity is None:
        return
    if quantity > production["stock"]:
        print("库存不足!")
        return

    total = production["price"] * quantity
    if total > wallet:
        print("余额不足!")
        return
    print(
        f"{production['name']} × {quantity}，"
        f"单价 {money(production['price'])}，总额 {money(total)}"
    )
    if not ask_yes_no("确认购买？y/n："):
        print("已取消购买。")
        return

    production["stock"] -= quantity
    wallet -= total
    order.append(
        {
            "id": id_next_order,
            "product_id": production_id,
            "product_name": production["name"],
            "unit_price": production["price"],
            "quantity": quantity,
            "total": total,
        }
    )
    print(f"购买成功! 订单编号：{id_next_order}")
    id_next_order += 1
    print(f"当前余额：{money(wallet)}")
    print(f"剩余库存：{production['stock']}")


def cart():
    return


def chongzhi():
    global wallet

    return


"""启动器"""


def main():
    while True:
        show_menu()
        choice = input("选择功能：").strip()
        if choice == "1":
            show_productions()
        elif choice == "2":
            find_production()
        elif choice == "3":
            add_production()
        elif choice == "4":
            update_productions()
        elif choice == "5":
            del_production()
        elif choice == "6":
            print("未完成")
            return
            """cart()"""
        elif choice == "7":
            buy()
        elif choice == "8":
            show_order()
        elif choice == "9":
            print(f"您的余额为：{money(wallet)}")
        elif choice == "0":
            print("未完成")
            return5
            """chongzhi()"""
        elif choice == "e":
            print("感谢使用，再见!")
            break
        else:
            print("您输入的指令不存在，请重试!")


if __name__ == "__main__":
    main()


```
