---
title: "Python 高级篇 · 第 2 章：Socket编程实战"
slug: python-expert-02
created: 2026-10-13
published: 2026-11-03
updated: 2026-11-09
description: "掌握 TCP/UDP Socket 编程，理解连接、收发数据与粘包问题，通过自定义消息协议和并发服务端练习网络通信。"
tags: ["高级篇"]
category: Python 学习
draft: false
lang: zh_CN
---

上一章：[高级篇第 1 章：计算机网络基础](/posts/python-expert-01/) · [课程目录](/posts/python-course/) · 下一章：[高级篇第 3 章：操作系统与多进程](/posts/python-expert-03/)

---

> 本章内容：掌握基于 TCP/UDP 的 socket 套接字编程，理解并解决粘包问题，实现并发服务端。

## 2.1 套接字基础

### 2.1.1 套接字的历史与类型

**套接字的两个家族**：最早的套接字（socket）并非用于网络通信，而是用于**同一台计算机上两个进程之间的通信**。不同进程的内存是隔离的：QQ 运行时申请一块内存，微信运行时申请另一块，它们不能直接访问对方的数据。

早期的解决办法是借助硬盘：QQ 把数据存到文件，微信读取该文件。最早的套接字就是这样**基于文件**通信的，称为 **AF_UNIX** 家族（AF 即 Address Family，地址家族）。

有了互联网后，需要通信的两个进程可能运行在不同计算机上。问题本质相同——都是进程间通信，但套接字不再基于文件，而是要封装互联网协议，于是有了 **AF_INET** 家族（Internet），这是我们主要使用的套接字家族。

**创建 socket 对象**：

```python
import socket

# 基于网络通信（AF_INET）+ TCP 协议（SOCK_STREAM）的套接字
sk = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
print(sk.family, sk.type)   # AddressFamily.AF_INET SocketKind.SOCK_STREAM

# UDP：数据报协议（SOCK_DGRAM）
udp = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
```

- **流式协议（SOCK_STREAM）**：TCP，数据像水流一样连续传输，之间没有边界
- **数据报协议（SOCK_DGRAM）**：UDP，数据有明确的边界，不会粘在一起

:::note[补充]
不传参数时默认为 `AF_INET + SOCK_STREAM`。socket 对象支持 `with` 语句自动关闭，还有 `AF_INET6` 用于 IPv6。
:::

### 2.1.2 TCP 服务端：饭馆类比

**类比：开饭馆**。服务端就像饭馆，需要固定地址让客人找到，核心流程用饭馆的运营来理解：

| 步骤 | 方法 | 饭馆类比 |
|---|---|---|
| 1. 创建 | `socket.socket()` | 准备店面 |
| 2. 绑定 | `bind((IP, 端口))` | 确定门牌号，客人能找到 |
| 3. 监听 | `listen(5)` | 开始营业，等待区有 5 个座位（半连接池） |
| 4. 接客 | `accept()` | 从等待区取一个客人进来服务 |
| 5. 通信 | `recv(1024)`、`send(data)` | 收点菜、上菜 |
| 6. 关闭连接 | `conn.close()` | 客人结账离开，桌子空出 |

**服务端绑定的 IP**：

| IP | 含义 |
|---|---|
| `127.0.0.1` | 本地回环地址，只能本机访问 |
| `192.168.x.x` | 本机私网 IP，同一局域网内可访问 |
| `0.0.0.0` | 全零地址，代表本机所有 IP，部署服务器后无需修改 |

**端口**：范围 0~65535，**1024 之前是系统保留端口**，避免使用；我们一般用 1024 以后的，如 5000、8080。

**半连接池**：客户端发起连接后进入等待区，`listen(5)` 的 5 表示等待区有 5 个位置。池满后新连接会超时。

```python
# tcp_server_basic.py —— 最简 TCP 服务端
import socket

sk = socket.socket(socket.AF_INET, socket.SOCK_STREAM)  # 1. 创建套接字
sk.bind(("127.0.0.1", 5000))                            # 2. 绑定地址
sk.listen(5)                                            # 3. 监听，半连接池 5
print("在 5000 端口等待客户端连接...")

conn, addr = sk.accept()                                # 4. 取出连接（阻塞）
print("客户端地址:", addr)

data = conn.recv(1024).decode("utf-8")                  # 5. 接收数据
print("收到:", data)
conn.send(data.upper().encode("utf-8"))                 # 6. 回复大写

conn.close()                                            # 7. 关闭连接
# sk.close()  # 服务端套接字一般不关闭
```

**关键概念**：

- `accept()` 和 `recv()` 都会**阻塞**：没有连接/数据时停在原地等待
- `recv(1024)` 是一次最大接收量（字节），写太大没意义（受缓存限制），一般写 1024~8192
- 收发的都是 **bytes** 类型，字符串要 `encode`，bytes 要 `decode`
- `conn.close()` 执行四次挥手；服务端的 `sk.close()` 一般不写，服务端应持续运行

### 2.1.3 TCP 客户端

客户端与服务端的区别：

- **不需要 bind**：客户端的 IP 和端口由系统动态分配（IP 可能变化，端口避免冲突）
- **不需要 listen 和 accept**：客户端主动连接服务端，不被动等待
- **需要 connect**：向服务端发起三次握手建立连接

```python
# tcp_client_basic.py —— 最简 TCP 客户端
import socket

sk = socket.socket(socket.AF_INET, socket.SOCK_STREAM)  # 1. 创建套接字
sk.connect(("127.0.0.1", 5000))                         # 2. 连接服务端（三次握手）

sk.send("hello".encode("utf-8"))                        # 3. 发送数据
data = sk.recv(1024).decode("utf-8")                    # 4. 接收回复
print(data)                                             # 输出: HELLO

sk.close()                                              # 5. 关闭连接（必须写）
```

**运行顺序**：必须先运行服务端，再运行客户端。先运行客户端会报 `ConnectionRefusedError`（连接被拒绝）。

### 2.1.4 send/recv 与缓存机制

**发空问题**：TCP **可以发空，但收不到空**。

```python
# 客户端直接敲回车（空字符串）会卡住
msg = input("请输入: ").strip()  # 直接回车，msg 是 ""
sk.send(msg.encode("utf-8"))     # send 可以发空
print(sk.recv(1024))             # 卡在这里：recv 收不到空，一直等待
```

**原因**：send 和 recv 都是在跟自己的操作系统打交道：

- **send**：把数据放进**自己的发送缓存**，操作系统再从缓存取数据封包发送
- **recv**：从**自己的接收缓存**取数据
- 发空时，缓存是空的，操作系统不发任何数据；对方的 recv 收不到数据，就阻塞等待

```text
客户端程序  send(b'')  ──▶  [客户端缓存: 空]  ──(无数据)──▶  [服务端缓存: 空]  ──▶  recv() 阻塞
```

**解决**：发送前先判空。

```python
while True:
    msg = input("请输入: ").strip()
    if not msg:              # 发空问题：空内容不发送
        continue
    sk.send(msg.encode("utf-8"))
    print(sk.recv(1024).decode("utf-8"))
```

### 2.1.5 通信循环与连接循环

**通信循环**：让客户端和服务端能多次收发数据，而不是一次就结束。

```python
# 服务端通信循环
while True:                                 # 通信循环
    data = conn.recv(1024).decode("utf-8")
    print("收到:", data)
    conn.send(data.upper().encode("utf-8"))
```

**客户端异常断开处理**：

- **Mac/Linux**：`recv` 收到空（`b''`）说明对方已断开 → `if not data: break`
- **Windows**：抛出 `ConnectionResetError` → `try...except`

```python
# 服务端通信循环：兼容两类系统
while True:
    try:
        data = conn.recv(1024)
        if not data:                    # Mac/Linux：收空说明对方断开
            break
        print(data.decode("utf-8"))
        conn.send(data.upper())
    except ConnectionResetError:        # Windows：异常断开抛错
        break
conn.close()
```

**连接循环**：让服务端能持续服务，一个客户端断开后继续服务下一个。

```python
# 服务端：连接循环 + 通信循环
import socket

sk = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sk.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)  # 端口重用
sk.bind(("127.0.0.1", 5001))
sk.listen(5)

while True:                             # 连接循环：持续服务
    conn, addr = sk.accept()
    print("客户端地址:", addr)
    while True:                         # 通信循环：与当前客户端收发
        try:
            data = conn.recv(1024)
            if not data:
                break
            conn.send(data.upper())
        except ConnectionResetError:
            break
    conn.close()
```

### 2.1.6 半连接池验证

**三次握手在 accept 之前完成**：客户端 `connect` 时，操作系统自动完成三次握手并把连接放进半连接池，`accept` 只是把连接从池里取出来。

用 Wireshark 抓包可以验证：选择 Loopback 回环网卡，运行客户端后能看到：

1. 完整的三次握手（SYN → SYN+ACK → ACK）
2. 客户端发送的数据包（PSH 标识）
3. 服务端回复的 ACK（确认收到数据）

**池满后的表现**：`listen(2)` 时，第 1、第 2 个客户端能连上（在池中排队），第 3 个及以后连不上，超时报 `TimeoutError`。

:::warning[注意]
严格来说，现代 Linux 中 `listen(backlog)` 限制的是**全连接队列**（已完成握手、等待 accept），实际可排队数量通常比 backlog 略多（如 backlog+1）。
:::

### 2.1.7 UDP 套接字

UDP 与 TCP 的主要区别：

| | TCP | UDP |
|---|---|---|
| 协议类型 | `SOCK_STREAM`（流式） | `SOCK_DGRAM`（数据报） |
| 是否建立连接 | 需要 connect | 不需要 |
| 服务端 | bind → listen → accept → recv/send | bind → recvfrom/sendto |
| 数据边界 | 无边界，会粘包 | 有边界，不粘包 |
| 能否发空 | 可以发但收不到 | 可以发也能收到 |
| 可靠性 | 可靠 | 不可靠，可能丢包 |

**UDP 服务端**：

```python
# udp_server.py
import socket

sk = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)  # 数据报协议
sk.bind(("127.0.0.1", 5003))                           # 仍需绑定地址
# 不需要 listen / accept

while True:
    data, addr = sk.recvfrom(1024)      # 收到 (数据, 客户端地址)
    print(addr, data)
    sk.sendto(data.upper(), addr)       # 回复时指定发给谁
```

**UDP 客户端**：

```python
# udp_client.py
import socket

sk = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
server_addr = ("127.0.0.1", 5003)
# 不需要 connect

while True:
    msg = input("请输入: ").strip()
    if msg == "q":
        break
    sk.sendto(msg.encode("utf-8"), server_addr)  # 直接回车也能发出空数据报
    data, addr = sk.recvfrom(1024)
    print(data.decode("utf-8"))
sk.close()
```

**UDP 可以发空**：TCP 像自来水（没水就收不到），UDP 像桶装水（可以送空桶）。UDP 的 `sendto` 一次就组织一个数据报发出，空数据也会作为一个"空桶"送达。

:::note[补充]
Windows 上，UDP 客户端向无人监听的端口发送数据，下一次 `recvfrom` 可能抛出 `ConnectionResetError [WinError 10054]`，这是 Windows 对"ICMP 端口不可达"的特殊处理。
:::

## 2.2 粘包问题与自定义协议

### 2.2.1 远程执行命令引出问题

**需求**：客户端发送终端命令（如 `ls`、`pwd`），服务端执行后返回结果。

**为什么用 TCP 而非 UDP**：UDP 传输不可靠，命令可能执行了但客户端没收到结果，或命令根本没发出去，无法判断执行状态。

**服务端用 subprocess 执行命令**：

```python
import subprocess

obj = subprocess.Popen(cmd.decode("utf-8"),
                       shell=True,
                       stdout=subprocess.PIPE,    # 正确结果
                       stderr=subprocess.PIPE)    # 错误结果
out_res = obj.stdout.read()   # bytes
err_res = obj.stderr.read()   # bytes
conn.send(out_res)
conn.send(err_res)
```

:::warning[安全警告]
`shell=True` 执行任意命令有严重安全隐患，真实项目绝不能把用户输入直接交给 shell，这里仅作练习。
:::

**问题现象**：执行 `tasklist`（Windows）或 `ps aux`（Mac/Linux）时，结果有几万字节，客户端 `recv(1024)` 只收到 1024 字节，**剩余数据留在缓存里**，下次 recv 会收到上次残留的数据——这就是**粘包问题**。

### 2.2.2 粘包的两个原因

**原因 1：TCP 是流式协议**，数据像水流一样连续传输，**数据之间没有边界**。客户端没把每次命令的结果收干净，残留数据和新数据粘在一起。

**原因 2：Nagle 算法**，TCP 底层优化，会把**多次间隔短、数据量小**的数据合并后一起发送，减少网络 IO 次数。

```python
# 粘包演示：连续 send 三次，接收方一次 recv 全收到
client.send(b"hello")
client.send(b"world")
client.send(b"python")
time.sleep(0.5)
print(conn.recv(1024))    # b'helloworldpython'
```

**粘包不是 bug，是 TCP 的特点**。我们要做的是：通过应用层协议把粘在一起的数据区分好，每次收完该收的部分。

:::note[补充]
可以用 `setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)` 关闭 Nagle 算法，但这**不能**解决粘包——接收端照样可能一次收到多条。解决粘包只能靠应用层协议。
:::

### 2.2.3 固定长度头部方案

**思路**：服务端发数据前，先把数据的总长度发过去，客户端收到长度后就知道接下来该收多少。

**关键**：头部（长度信息）必须**固定长度**，否则接收方不知道前面多少字节是头部。

```python
# 服务端：固定 8 字节的头部
data_size = len(out_res) + len(err_res)
header = bytes(str(data_size), "utf-8").zfill(8)   # 左边补 0，固定 8 字节
print(header)                                      # 如 b'00081234'
conn.send(header)                                  # 1. 先发头部
conn.send(out_res)                                 # 2. 再发数据
conn.send(err_res)
```

```python
# 客户端：循环收满指定长度
data_size = int(client.recv(8).decode("utf-8"))    # 1. 先收 8 字节头部
recv_size = 0
data = b""
while recv_size < data_size:                       # 2. 没收满就一直收
    res = client.recv(1024)
    recv_size += len(res)
    data += res
print(data.decode("utf-8"))
```

**固定长度的其他方法**：

- `struct.pack("!i", 81234)`：4 字节二进制整数，`struct.unpack("!i", header)[0]` 解析
- `(81234).to_bytes(4, "big")`：4 字节，`int.from_bytes(header, "big")` 解析

这两种是二进制编码，比 `zfill` 的十进制字符串更省空间。

### 2.2.4 粘包最终方案

**头部用字典 + JSON**：传文件时头部不仅包含长度，还有文件名、MD5 等信息，用字典组织更清晰。

```python
header = {
    "file_name": "a.mp4",
    "file_size": data_size,
    "md5": "c4ca4238a0b923820dcc509a6f75849b"
}
header_bytes = json.dumps(header).encode("utf-8")
```

**头部长度不固定怎么办**：文件名、大小变化，头部长度随之变化。解决：**给头部再加一个头**，只放头部的长度，固定 4 字节。

```python
header_h = bytes(str(len(header_bytes)), "utf-8").zfill(4)  # 头部长度，固定 4 字节
```

4 个十进制数字最大可表示 9999 字节的头部，远远够用（头部一般只有几百字节）。

**发送顺序**：头部长度 → 头部 → 数据

```text
| 4 字节：头部长度 | 头部（字典→JSON→bytes） | 数据 |
```

**服务端最终代码**：

```python
# cmd_server_final.py
import json
import socket
import subprocess

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind(("127.0.0.1", 8080))
server.listen(5)

while True:
    conn, address = server.accept()
    while True:
        try:
            cmd = conn.recv(1024)
            if not cmd:
                break
            obj = subprocess.Popen(cmd.decode("utf-8"), shell=True,
                                   stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            out_res = obj.stdout.read()
            err_res = obj.stderr.read()
            data_size = len(out_res) + len(err_res)

            # 头部：字典→JSON→bytes
            header = {"file_name": "result.txt", "file_size": data_size,
                      "md5": "demo_md5_value"}
            header_bytes = json.dumps(header).encode("utf-8")
            header_h = bytes(str(len(header_bytes)), "utf-8").zfill(4)

            conn.send(header_h)        # 1. 头部长度
            conn.send(header_bytes)    # 2. 头部
            conn.send(out_res)         # 3. 数据
            conn.send(err_res)
        except ConnectionResetError:
            break
    conn.close()
```

**客户端最终代码**：

```python
# cmd_client_final.py
import json
import socket
import sys

client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
client.connect(("127.0.0.1", 8080))
encoding = "gbk" if sys.platform == "win32" else "utf-8"

while True:
    cmd = input("请输入终端命令: ").strip()
    if not cmd:
        continue
    client.send(cmd.encode("utf-8"))

    # 1. 收头部长度
    header_size = int(client.recv(4).decode("utf-8"))
    # 2. 收头部
    header_json = client.recv(header_size).decode("utf-8")
    header = json.loads(header_json)
    print("头部信息:", header)
    data_size = header["file_size"]

    # 3. 循环收数据
    recv_size = 0
    data = b""
    while recv_size < data_size:
        res = client.recv(1024)
        recv_size += len(res)
        data += res
    print(data.decode(encoding, errors="ignore"))
```

**套接字最终模板**：先发头部长度，再发头部数据，最后发数据；收的时候也是先收头部长度，再收头部数据，最后收数据。

:::tip[技巧]
`send` 可能只发送部分数据，更稳妥的做法是用 `sendall`。同理，收头部时可以封装一个"精确接收 n 字节"的函数，防止头部一次收不全。
:::

### 2.2.5 UDP 不会粘包

**UDP 是面向消息的数据报协议**，每条消息是一个完整的报文，数据有边界，不会粘包。

- TCP：连着 send 两次，数据粘在一起，对方可以只 recv 一次全收到
- UDP：**一个 sendto 对应一个 recvfrom**，连着发两次，对方必须收两次

**收不干净会怎样**：UDP 认为你不要剩下的数据了，**直接丢弃**；Windows 上会报错 `WinError 10040`。

```python
# udp_no_sticky.py
import socket

server = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
server.bind(("127.0.0.1", 9091))
client = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

client.sendto(b"hello", ("127.0.0.1", 9091))
client.sendto(b"abc", ("127.0.0.1", 9091))

print(server.recvfrom(1024)[0])   # b'hello'
print(server.recvfrom(1024)[0])   # b'abc'

# 收不干净：只收 3 字节
client.sendto(b"hello", ("127.0.0.1", 9091))
print(server.recvfrom(3)[0])      # b'hel'，剩余 2 字节被丢弃（Windows 报错）
```

**UDP 的数据量限制**：

- 一个数据包最大约 1472 字节（MTU 1500 − IP 头 20 − UDP 头 8）
- **稳定传输约 512 字节**，再大就不够稳定（涉及分片重组）

**UDP 的应用**：早期 QQ（速度快但偶尔丢消息）、DNS 解析（请求数据少、速度快）。13 台根 DNS 服务器的数量限制也源于 UDP 的 512 字节稳定传输限制。

## 2.3 socketserver 并发

### 2.3.1 为什么需要并发

前面写的服务端"持续提供服务"但**不能并发**：一次只能服务一个客户端。

**用饭馆类比**：

```python
while True:                       # 连接循环：到门口接客
    conn, addr = server.accept()
    while True:                   # 通信循环：领进房间服务
        data = conn.recv(1024)
        # 服务中...
```

现在服务端只有一个人，他既要到门口接客，又要把客人领进房间服务，必须把前一个客人服务完才能去接下一个。

**改进思路**：一个人专门在门口接客，每接到一个客人就交给一个服务员（线程/进程）去服务，自己转身去接下一个——这就是并发的原理。

### 2.3.2 TCP 并发服务端

`socketserver` 模块按以下套路使用：

1. 定义一个类，继承 `socketserver.BaseRequestHandler`
2. 类里必须定义 `handle` 方法
3. 在 `handle` 里，`self.request` 相当于 `conn`（TCP）或 `(data, sock)` 元组（UDP）

```python
# tcp_server_concurrent.py
import socketserver

class RequestHandle(socketserver.BaseRequestHandler):
    """每来一个客户端连接，就实例化本类，并在新线程中调用 handle()"""

    def handle(self):
        print(self.request)          # 连接对象（TCP）
        print(self.client_address)   # 客户端地址
        while True:                  # 通信循环
            try:
                data = self.request.recv(1024)
                if not data:
                    break
                print(data.decode("utf-8"))
                self.request.send(data.upper())
            except ConnectionResetError:
                break

if __name__ == "__main__":
    # ThreadingTCPServer：多线程版；传类本身，不加括号
    sk = socketserver.ThreadingTCPServer(("127.0.0.1", 5001), RequestHandle)
    sk.serve_forever()  # 负责接客，每接到一个连接就起一个线程
```

- `ThreadingTCPServer`：多线程版，Windows/Linux/Mac 都支持
- `ForkingTCPServer`：多进程版，依赖 `os.fork`，**Windows 不支持**
- `serve_forever()`：相当于连接循环的 `accept` 部分，每获取一个连接就起一个线程执行 `handle()`

**客户端不用改**，允许 PyCharm 同时运行多个实例（勾选"Allow multiple instances"），可以看到多个客户端同时通信的并发效果。

:::note[补充]
`handle()` 返回后，`socketserver` 会自动关闭连接。若换成非并发的 `socketserver.TCPServer`，就会退化成"一次只服务一个"。
:::

### 2.3.3 UDP 并发服务端

**UDP 默认"看起来能并发"是假象**：服务端核心代码只有"收一次、回一次"两行，数据又短，收到后立刻回复，两行执行完就服务完一个客户端了，过程非常快，所以第二个客户端来时感觉也能及时得到服务。

**验证**：用 `time.sleep(int(data))` 模拟处理耗时，客户端发的数字是几，服务端就"处理"几秒。第一个客户端发 `10`，第二个紧接着发 `1`，如果 UDP 默认并发，第二个应该 1 秒后收到回复，实际上要等第一个的 10 秒结束后才收到——**UDP 默认不支持并发**。

**用 socketserver 改写**：

```python
# udp_server_concurrent.py
import socketserver
import time

class RequestHandle(socketserver.BaseRequestHandler):
    def handle(self):
        data, sk = self.request          # (客户端数据, 用于回数据的 socket 对象)
        time.sleep(int(data))            # 模拟耗时处理，不影响其他客户端
        sk.sendto(data.upper(), self.client_address)

if __name__ == "__main__":
    sk = socketserver.ThreadingUDPServer(("127.0.0.1", 5002), RequestHandle)
    sk.serve_forever()  # 只负责收数据，每收到一个就起一个线程处理
```

**UDP 的 `self.request`**：是一个元组 `(客户端数据, socket对象)`，第二个元素用来给客户端回数据。

:::warning[注意]
UDP 的 `handle()` 只处理"一个数据报"，不要在里面写 `while True` 通信循环——下一个数据报会触发下一次 `handle()`。
:::

### 2.3.4 学习建议

接下来进入并发编程。学习建议：

- **爬坡阶段已结束，学习要懂得取舍**：知道一个东西是什么、能做什么、怎么用就够了，暂时不必深挖底层
- 现阶段主要追求**知识面的广度**和**自我解决问题的能力**
- 后面讲新知识时，会先给出便于理解的基本概念，在使用中再逐步深入

## 本章小结

- 套接字最早用于同一主机进程通信（AF_UNIX），网络通信使用 AF_INET；TCP 是流式协议（SOCK_STREAM），UDP 是数据报协议（SOCK_DGRAM）
- TCP 服务端：创建 → bind（IP+端口）→ listen（半连接池）→ accept → recv/send → conn.close；客户端：创建 → connect → send/recv → close
- 收发都是 bytes；`accept`、`recv` 会阻塞；`recv(1024)` 是一次最大接收量；通信循环实现多次收发，连接循环实现持续服务
- send/recv 都只和自己的缓存打交道，TCP 发空收不到（要判空），UDP 可以发空也能收到
- 客户端异常断开：Mac/Linux 收空 → `if not data: break`；Windows 抛 `ConnectionResetError` → `try/except`
- 半连接池中的连接已完成三次握手；池满后新连接超时；池子大小改变不了体验，关键是并发能力
- **粘包原因**：TCP 流式协议无边界 + Nagle 算法合并短间隔小数据；recv 没收完的数据留在缓存，下次会收到残留
- **解决关键**：让接收方知道数据总长度，循环收满为止。自定义协议 = 自定义头部内容 + 固定头部长度
- **最终方案**：头部用字典 + json 序列化，再加固定 4 字节的"头部长度"；发送顺序：头部长度 → 头部 → 数据
- UDP 不会粘包（有边界），收不干净的数据被丢弃（Windows 报错）；单包最大 1472 字节，稳定约 512 字节
- `socketserver` 套路：继承 `BaseRequestHandler`、重写 `handle()`，用 `ThreadingTCPServer` / `ThreadingUDPServer` + `serve_forever()`
- TCP 下 `self.request` 是连接对象；UDP 下是 `(数据, socket对象)` 元组；`ForkingTCPServer` 依赖 `os.fork`，Windows 不支持

## 练习

1. 为什么 TCP 客户端不需要 `bind`，但需要 `connect`？UDP 客户端呢？
2. 为什么 `recv(1024)` 写成 `recv(1000000)` 不能从根本上解决粘包？
3. 最终方案中为什么要"给头部再加一个头"？为什么用 json 而不是 pickle？
4. 用 `socketserver.ThreadingTCPServer` 写一个并发服务端：客户端发来什么，服务端就回复"已收到：xxx"。
5. 如何验证普通 UDP 服务端"看起来并发"只是假象？

<details><summary>参考答案</summary>

1. TCP 客户端不 bind 是因为 IP 可能变化、端口要避免冲突，由系统动态分配；但需要 connect 向服务端发起三次握手建立连接。UDP 客户端同样不 bind，也不需要 connect（无连接），直接 sendto 发数据。

2. 缓存大小有限，数据大小无法预知，可能远超缓存；数据从服务端流到客户端需要时间，改大 recv 也可能只收到一部分。根本问题是 TCP 流式协议没有边界，接收方不知道该收多少。

3. 字典头部的长度会随文件名、文件大小变化，不好固定；固定一个很长的头部既浪费又可能收不全，所以让头部"该多长就多长"，再用固定 4 字节的小头部告诉对方头部有多长。pickle 只能在 Python 程序之间使用，json 是通用格式。

4.
```python
import socketserver

class Handler(socketserver.BaseRequestHandler):
    def handle(self):
        while True:
            try:
                data = self.request.recv(1024)
                if not data:
                    break
                self.request.send("已收到：".encode("utf-8") + data)
            except ConnectionResetError:
                break

if __name__ == "__main__":
    socketserver.ThreadingTCPServer(("127.0.0.1", 9000), Handler).serve_forever()
```

5. 服务端收到数据后 `time.sleep(int(data))`，一个客户端发 `10`，另一个紧接着发 `1`；若第二个客户端要等 10 秒才收到回复，说明服务端是一个一个处理的。

</details>

---

上一章：[高级篇第 1 章：计算机网络基础](/posts/python-expert-01/) · [课程目录](/posts/python-course/) · 下一章：[高级篇第 3 章：操作系统与多进程](/posts/python-expert-03/)
