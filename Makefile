mkf_abpath	:= $(patsubst %Makefile, %, $(abspath $(MAKEFILE_LIST)))
targets		:= m3u8 postman proxy translate work

help:
	@$(foreach target,$(targets),echo "--- make $(target) ---";)
	@echo "--- make clean ---"

%:
	@mkdir -p bin/
	@cd chrome-$* && zip -rq ../bin/$*.zip *
	
.PHONY: clean

clean:
	rm -rf bin

