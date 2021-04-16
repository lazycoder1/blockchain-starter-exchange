import { tokens, EVM_REVERT } from './helpers';

const Token = artifacts.require('./Token');

require('chai')
    .use(require('chai-as-promised'))
    .should()

contract('Token', ([deployer, receiver, exchange]) => {
    const NAME = 'LightningDex';
    const SYMBOL = 'LDX';
    const DECIMALS = '18';
    const TOTAL_SUPPLY = tokens(1000000);
    let token;

    beforeEach(async () => {
        token = await Token.new();
    })

    describe('deployment', () => {
        it('tracks the name', async () => {
            const name = await token.name();
            name.should.equal(NAME);
        })

        it('tracks the symbol', async () => {
            const symbol = await token.symbol();
            symbol.should.equal(SYMBOL);
        })

        it('tracks the decimals', async () => {
            const decimals = await token.decimals();
            decimals.toString().should.equal(DECIMALS);
        })

        it('tracks the supply', async () => {
            const totalSupply = await token.totalSupply();
            totalSupply.toString().should.equal(TOTAL_SUPPLY.toString());
        })

        it('assigns the total supply to the developer', async () => {
            const result = await token.balanceOf(deployer);
            result.toString().should.equal(TOTAL_SUPPLY.toString());
        })
    })

    describe('sending tokens', () => {
        let result;
        let amount;

        describe('success', async () => {
            beforeEach(async () => {
                amount = tokens(100);
                result = await token.transfer(receiver, amount, { from: deployer });
            });

            it('transfers token balances', async () => {
                let balanceOf;
                balanceOf = await token.balanceOf(deployer);
                balanceOf.toString().should.equal(tokens(999900).toString());
                balanceOf = await token.balanceOf(receiver);
                balanceOf.toString().should.equal(tokens(100).toString());

            });

            it('emits a Transfer event', async () => {
                const log = result.logs[0]
                log.event.should.eq('Transfer');
                const event = log.args;
                event.from.toString().should.equal(deployer, "from is corect");
                event.to.toString().should.equal(receiver, "to is correct");
                event.value.toString().should.equal(amount.toString(), "amount is equal");
            })
        })

        describe('failure', async () => {
            it('rejects insuffecient balances', async () => {
                let invalidAmount = tokens(10000000) // 10 Mil , greater than total supply
                await token.transfer(receiver, invalidAmount, { from: deployer })
                    .should.be.rejectedWith(EVM_REVERT);

                invalidAmount = tokens(10)
                await token.transfer(deployer, invalidAmount, { from: receiver })
                    .should.be.rejectedWith(EVM_REVERT);
            })

            it("rejects invalid recipients", async () => {
            	await token.transfer(0x0, amount, {from: deployer})
            		.should.be.rejectedWith(EVM_REVERT);
            })
        });
    });

    describe('approving tokens', () => {
    	let amount;
    	let result;

    	beforeEach(async () =>{
    		amount = tokens(100)
    		result = await token.approve(exchange, amount, { from: deployer })
    	})

    	describe('success', () => {
    		it('allocates on allowance for delegated token spending on an exchange', async () => {
    			const allowance = await token.allowance(deployer, exchange)
    			allowance.toString().should.equal(amount.toString())
    		})

    		it('emits a Approval event', async () => {
                const log = result.logs[0]
                log.event.should.eq('Approval');
                const event = log.args;
                event.owner.toString().should.equal(deployer, "from is corect");
                event.spender.toString().should.equal(exchange, "to is correct");
                event.value.toString().should.equal(amount.toString(), "amount is equal");
            })
    	})

    	describe('failure', () => {
    		it('rejects insuffecient balances', async () => {
                let invalidAmount = tokens(10000000) // 10 Mil , greater than total supply
                await token.allowance(receiver, invalidAmount, { from: deployer })
                    .should.be.rejectedWith(EVM_REVERT);

                invalidAmount = tokens(10)
                await token.allowance(deployer, invalidAmount, { from: receiver })
                    .should.be.rejectedWith(EVM_REVERT);
            })

            it("rejects invalid recipients", async () => {
            	await token.allowance(0x0, amount, {from: deployer})
            		.should.be.rejectedWith(EVM_REVERT);
            })
    	})
    })

    describe('sending tokens', () => {
    	let amount;
    	let result;

    	beforeEach( async () => {
    		amount = tokens(100);
    		await token.approve(exchange, amount, { from: deployer });
    	});

        describe('success', () => {
            beforeEach( async () => {
                result = await token.transferFrom(deployer ,receiver, amount, { from: exchange });
            });

            it('transfers token balances', async () => {
                let balanceOf;
                balanceOf = await token.balanceOf(deployer);
                balanceOf.toString().should.equal(tokens(999900).toString());
                balanceOf = await token.balanceOf(receiver);
                balanceOf.toString().should.equal(tokens(100).toString());
            });

            it('resets the allowance', async () => {
                const allowance = await token.allowance(deployer, exchange)
    			allowance.toString().should.equal('0')
            });

            it('emits a Transfer event', async () => {
                const log = result.logs[0]
                log.event.should.eq('Transfer');
                const event = log.args;
                event.from.toString().should.equal(deployer, "from is corect");
                event.to.toString().should.equal(receiver, "to is correct");
                event.value.toString().should.equal(amount.toString(), "amount is equal");
            })
        })

    	describe('failure', () => {
    		it('rejects insuffecient amounts', async () => {
    			// Attempt transfer too many tokens
    			let invalidAmount = tokens(100000000) // 10 Mil , greater than total supply
                await token.transferFrom(deployer, receiver, invalidAmount, { from: exchange })
                    .should.be.rejectedWith(EVM_REVERT);

                invalidAmount = tokens(10)
                await token.transferFrom(receiver, receiver, invalidAmount, { from: exchange })
                    .should.be.rejectedWith(EVM_REVERT);
    			
    		})


            it("rejects invalid recipients", async () => {
            	await token.transferFrom(deployer , 0x0, amount, {from: exchange})
            		.should.be.rejectedWith(EVM_REVERT);
            })
    	})
    })
});