all: build run stop

build:
	open -g /Applications/Docker.app
	sleep 30

run: 
	docker stop mysql-final
	sleep 3
	docker stop redis-server
	sleep 3
	docker start mysql-final
	sleep 5
	docker start redis-server
	sleep 3
	npm run dev

old_run:
	docker run -d -p 8001:8000 final-api &

redis_init:
	docker run -d --name redis-server -p 6379:6379 redis:latest

create:
	docker run -d --name mysql-final                   \
	--network mysql-net                                     \
		-p "3306:3306"                                          \
		-e "MYSQL_ROOT_PASSWORD=hunter2"        \
		-e "MYSQL_DATABASE=tarpaulin"                \
		-e "MYSQL_USER=admin"                        \
		-e "MYSQL_PASSWORD=hunter2"                     \
		mysql
	sleep 10
	docker run -d --name redis-server -p 6379:6379 redis:latest


sql_start:
	docker run -d --name mysql-final                   \
	--network mysql-net                                     \
		-p "3306:3306"                                          \
		-e "MYSQL_ROOT_PASSWORD=hunter2"        \
		-e "MYSQL_DATABASE=tarpaulin"                \
		-e "MYSQL_USER=admin"                        \
		-e "MYSQL_PASSWORD=hunter2"                     \
		mysql

sql_shell:
	echo "Password:                                    hunter2"
	docker run --rm -it		\
		--network mysql-net	\
		mysql			\
		mysql -h mysql-final -u admin -p tarpaulin

sql_cli:
	mysql -uroot -phunter2 -h 127.0.0.1 -P 3306 --ssl-mode=DISABLED

stop:
	docker stop mysql-final
	docker stop redis-server
	echo "ALL RUNNING CONTAINERS ARE DESTROYED"

clean:
	pkill -SIGHUP -f /Applications/Docker.app 'docker serve'
