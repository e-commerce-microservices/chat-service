.PHONY: rebuild
rebuild:
	docker build -t ngoctd/ecommerce-chat:latest . && \
	docker push ngoctd/ecommerce-chat