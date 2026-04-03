import pymysql as mysql

def main():
    with mysql.connect(host='localhost', user='root', passwd='123456', autocommit=True) as conn:
        with conn.cursor() as cursor:
            cursor.execute('create database if not exists user_db')
            conn.select_db('user_db')
            cursor.execute("""
                create table if not exists user(
                id int unsigned auto_increment primary key ,
                name varchar(50) unique not null ,
                pd varchar(255) not null ,
                em varchar(100) ,
                at datetime default now()
                ) comment '用户表'
            """)
            cursor.execute("""
                create table if not exists user_com(
                id int unsigned auto_increment primary key,
                user_id int unsigned not null,
                cname varchar(50) not null,
                con text not null,
                cat datetime default now(),
                foreign key (user_id) references user(id),
                foreign key (cname) references user(name)
                ) comment '评论表'
            """)
if __name__ == '__main__':
    main()










