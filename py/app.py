from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import pymysql as mysql
import secrets
import time

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'

# 存储活跃的 token（生产环境应使用 Redis）
active_tokens = {}

# 启用 CORS 支持
CORS(app, 
     supports_credentials=True,
     origins=[
         'http://localhost:5500',
         'http://127.0.0.1:5500',
         'http://localhost:3000',
         'http://127.0.0.1:3000',
         'null',
         'http://localhost:8080',
         'http://127.0.0.1:8080',
         'https://11451459999.github.io',
     ])

def mysql_con():
    conn = mysql.connect(host='localhost', user='root', passwd='123456', database='user_db', autocommit=True)
    return conn

def get_current_user():
    """从 header 获取 token 并验证用户"""
    auth_header = request.headers.get('Authorization', '')
    print(f"[DEBUG] Authorization header: {auth_header}")
    token = auth_header.replace('Bearer ', '')
    print(f"[DEBUG] Token: {token}")
    print(f"[DEBUG] Active tokens: {list(active_tokens.keys())}")
    if not token or token not in active_tokens:
        print("[DEBUG] Token 无效或不存在")
        return None
    
    token_data = active_tokens[token]
    # 检查 token 是否过期（7天）
    if time.time() - token_data['created_at'] > 7 * 24 * 60 * 60:
        del active_tokens[token]
        return None
    
    print(f"[DEBUG] 用户验证成功: {token_data['username']}")
    return token_data

@app.route('/register', methods=['POST'])
def register():
    username = request.form.get('username')
    password = request.form.get('password')
    email = request.form.get('email')

    if not username or not password:
        return jsonify({'suc': False, 'mes': '用户名和密码不能为空'})

    conn = mysql_con()
    cursor = conn.cursor()
    cursor.execute("select id from user where name = %s", (username,))
    if cursor.fetchone():
        conn.close()
        return jsonify({'suc': False, 'mes': '用户已存在'})
    
    pw_hash = generate_password_hash(password)
    cursor.execute(
        "insert into user (name, pd, em) values (%s, %s, %s)",
        (username, pw_hash, email)
    )
    conn.close()

    return jsonify({'suc': True, 'mes': '注册成功'})

@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')

    if not username or not password:
        return jsonify({'suc': False, 'mes': '用户名和密码不能为空'})

    conn = mysql_con()
    cursor = conn.cursor()
    cursor.execute("select id, name, pd from user where name = %s", (username,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        return jsonify({'suc': False, 'mes': '用户不存在'})

    if not check_password_hash(user[2], password):
        return jsonify({'suc': False, 'mes': '密码错误'})

    # 生成 token
    token = secrets.token_hex(32)
    active_tokens[token] = {
        'user_id': user[0],
        'username': user[1],
        'created_at': time.time()
    }

    return jsonify({
        'suc': True, 
        'mes': f"登录成功！欢迎 {user[1]}", 
        'username': user[1],
        'token': token
    })

@app.route('/logout', methods=['POST'])
def logout():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if token in active_tokens:
        del active_tokens[token]
    return jsonify({'suc': True, 'mes': '已退出登录'})

@app.route('/comment', methods=['POST'])
def comment():
    user = get_current_user()
    if not user:
        return jsonify({'suc': False, 'mes': '请先登录'})

    content = request.form.get('content')

    conn = mysql_con()
    cursor = conn.cursor()
    cursor.execute(
        "insert into user_com (user_id, cname, con) values (%s, %s, %s)",
        (user['user_id'], user['username'], content)
    )
    conn.close()
    return jsonify({'suc': True, 'mes': '评论成功了'})

@app.route('/comments', methods=['GET'])
def comments():
    conn = mysql_con()
    cursor = conn.cursor()
    cursor.execute("select id, cname, con, cat from user_com order by cat desc")
    user_comments = cursor.fetchall()
    conn.close()

    result = [{'id': c[0], 'cname': c[1], 'con': c[2], 'cat': str(c[3])} for c in user_comments]
    return jsonify({'suc': True, 'comments': result})

@app.route('/del_comment/<int:comment_id>', methods=['DELETE'])
def del_comment(comment_id):
    user = get_current_user()
    if not user:
        return jsonify({'suc': False, 'mes': '请先登录'})

    conn = mysql_con()
    cursor = conn.cursor()
    cursor.execute("delete from user_com where id = %s", (comment_id,))
    conn.close()
    return jsonify({'suc': True, 'mes': '删除成功'})

if __name__ == '__main__':
    app.run(debug=True, port=8080)