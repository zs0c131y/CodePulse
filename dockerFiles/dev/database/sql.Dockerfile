FROM mysql:oraclelinux9


COPY databases/init/*.sql /docker-entrypoint-initdb.d/
