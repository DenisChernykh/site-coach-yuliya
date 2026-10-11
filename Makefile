PYTHON ?= python3
HOST ?= 127.0.0.1
PORT ?= 4173

.PHONY: preview build check

preview:
	$(PYTHON) -m http.server $(PORT) --bind $(HOST) --directory design

build:
	$(PYTHON) scripts/build_preview.py

check:
	$(PYTHON) scripts/build_preview.py --check
	$(PYTHON) scripts/validate.py
