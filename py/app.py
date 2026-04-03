from flask import Flask, request, session, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
import pymysql as mysql

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'  # Session 加密

# 配置 session cookie 属性，支持跨域
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # 允许跨站请求携带 cookie
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)  # session 有效期7天

# 启用 CORS 支持，指定允许的 origin（本地开发环境）
CORS(app, 
     supports_credentials=True,
     origins=[
         'http://localhost:5500',      # VS Code Live Server 默认端口
         'http://127.0.0.1:5500',
         'http://localhost:3000',
         'http://127.0.0.1:3000',
         'null',                       # 支持 file:// 协议打开
         'http://localhost:8080',
         'http://127.0.0.1:8080',
     ])

#链接mysql
def mysql_con():
    conn = mysql.connect(host='localhost', user='root', passwd='123456', database='user_db', autocommit=True)
    return conn
#注册 - 纯 API 接口，前端处理 UI
@app.route('/register', methods=['POST'])
def register():
    username = request.form.get('username')
    password = request.form.get('password')
    email = request.form.get('email')

    if not username or not password:
        return jsonify({'suc': False, 'mes': '用户名和密码不能为空'})

    conn = mysql_con()
    cursor = conn.cursor()
    # 检查用户是否已经存在
    cursor.execute("select id from user where name = %s", (username,))
    if cursor.fetchone():
        conn.close()
        return jsonify({'suc': False, 'mes': '用户已存在'})
    #将get请求数据存入表中
    pw_hash = generate_password_hash(password)
    cursor.execute(
        "insert into user (name, pd, em) values (%s, %s, %s)",
        (username, pw_hash, email)
    )
    conn.close()

    return jsonify({'suc': True, 'mes': '注册成功'})

#登录 - 纯 API 接口，前端处理 UI
@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')

    if not username or not password:
        return jsonify({'suc': False, 'mes': '用户名和密码不能为空'})

    conn = mysql_con()
    cursor = conn.cursor()

    # 检查用户存不存在
    cursor.execute("select id, name, pd from user where name = %s", (username,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        return jsonify({'suc': False, 'mes': '用户不存在'})

    if not check_password_hash(user[2], password):
        return jsonify({'suc': False, 'mes': '密码错误'})

    # 登录成功，设置 session
    session['user_id'] = user[0]
    session['username'] = user[1]
    return jsonify({'suc': True, 'mes': f"登录成功！欢迎 {user[1]}", 'username': user[1]})

#退出登录
@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'suc': True, 'mes': '已退出登录'})

#评论
@app.route('/comment', methods=['POST'])
def comment():
    if 'user_id' not in session:
        return jsonify({'suc': False, 'mes': '请先登录'})

    content = request.form.get('content')

    conn = mysql_con()
    cursor = conn.cursor()
    cursor.execute(
        "insert into user_com (user_id, cname, con) values (%s, %s, %s)",
        (session['user_id'], session['username'], content)
    )
    conn.close()
    return jsonify({'suc': True, 'mes': '评论成功了'})

#获取评论
@app.route('/comments', methods=['GET'])
def comments():
    conn = mysql_con()
    cursor = conn.cursor()
    cursor.execute("select id, cname, con, cat from user_com order by cat desc")
    user_comments = cursor.fetchall()
    conn.close()

    result = [{'id': c[0], 'cname': c[1], 'con': c[2], 'cat': str(c[3])} for c in user_comments]
    return jsonify({'suc': True, 'comments': result})

#删除评论
@app.route('/del_comment/<int:comment_id>', methods=['DELETE'])
def del_comment(comment_id):
    if 'user_id' not in session:
        return jsonify({'suc': False, 'mes': '请先登录'})

    conn = mysql_con()
    cursor = conn.cursor()

    cursor.execute("delete from user_com where id = %s", (comment_id,))
    conn.close()
    return jsonify({'suc': True, 'mes': '删除成功'})

if __name__ == '__main__':
    app.run(debug=True, port=8080)








