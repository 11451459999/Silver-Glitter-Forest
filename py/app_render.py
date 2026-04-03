import os
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import psycopg2
from psycopg2.extras import RealDictCursor
import secrets
import time

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))

# 存储活跃的 token（生产环境应使用 Redis）
active_tokens = {}

# 数据库连接
def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    if database_url:
        conn = psycopg2.connect(database_url)
    else:
        # 本地开发环境
        conn = psycopg2.connect(
            host='localhost',
            database='user_db',
            user='postgres',
            password='123456'
        )
    return conn

# 初始化数据库表
def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) UNIQUE NOT NULL,
            pd VARCHAR(255) NOT NULL,
            em VARCHAR(100),
            at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_com (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            cname VARCHAR(50) NOT NULL,
            con TEXT NOT NULL,
            cat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

# 启用 CORS 支持
CORS(app, 
     supports_credentials=True,
     resources={
         r"/*": {
             "origins": "*",
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization"]
         }
     })

# 添加 CORS 中间件
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

def get_current_user():
    """从 header 获取 token 并验证用户"""
    auth_header = request.headers.get('Authorization', '')
    token = auth_header.replace('Bearer ', '')
    if not token or token not in active_tokens:
        return None
    
    token_data = active_tokens[token]
    # 检查 token 是否过期（7天）
    if time.time() - token_data['created_at'] > 7 * 24 * 60 * 60:
        del active_tokens[token]
        return None
    
    return token_data

@app.route('/register', methods=['POST'])
def register():
    username = request.form.get('username')
    password = request.form.get('password')
    email = request.form.get('email')

    if not username or not password:
        return jsonify({'suc': False, 'mes': '用户名和密码不能为空'})

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE name = %s", (username,))
    if cursor.fetchone():
        conn.close()
        return jsonify({'suc': False, 'mes': '用户已存在'})
    
    pw_hash = generate_password_hash(password)
    cursor.execute(
        "INSERT INTO users (name, pd, em) VALUES (%s, %s, %s)",
        (username, pw_hash, email)
    )
    conn.commit()
    conn.close()

    return jsonify({'suc': True, 'mes': '注册成功'})

@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')

    if not username or not password:
        return jsonify({'suc': False, 'mes': '用户名和密码不能为空'})

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, pd FROM users WHERE name = %s", (username,))
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

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO user_com (user_id, cname, con) VALUES (%s, %s, %s)",
        (user['user_id'], user['username'], content)
    )
    conn.commit()
    conn.close()
    return jsonify({'suc': True, 'mes': '评论成功了'})

@app.route('/comments', methods=['GET'])
def comments():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, cname, con, cat FROM user_com ORDER BY cat DESC")
    user_comments = cursor.fetchall()
    conn.close()

    result = [{'id': c[0], 'cname': c[1], 'con': c[2], 'cat': str(c[3])} for c in user_comments]
    return jsonify({'suc': True, 'comments': result})

@app.route('/del_comment/<int:comment_id>', methods=['DELETE'])
def del_comment(comment_id):
    user = get_current_user()
    if not user:
        return jsonify({'suc': False, 'mes': '请先登录'})

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM user_com WHERE id = %s", (comment_id,))
    conn.commit()
    conn.close()
    return jsonify({'suc': True, 'mes': '删除成功'})

@app.route('/')
def index():
    return jsonify({'status': 'ok', 'message': 'Silver Glitter Forest API'})

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
