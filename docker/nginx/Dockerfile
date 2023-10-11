FROM nginx:alpine
COPY ./nginx.conf /etc/nginx/nginx.conf
RUN mkdir /etc/nginx/ssl.d -p
COPY ./*.pem /etc/nginx/ssl.d
