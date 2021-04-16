import { tokens, ether, EVM_REVERT, ETHER_ADDRESS } from './helpers';

const Exchange = artifacts.require('./Exchange');
const Token = artifacts.require('./Token');

require('chai')
    .use(require('chai-as-promised'))
    .should()

contract('Exchange', ([deployer, feeAccount, user1, user2]) => {
    let token;
    let exchange;
    let feePercent = 10;

    beforeEach(async () => {
        token = await Token.new();
        exchange = await Exchange.new(feeAccount, feePercent);
        await token.transfer(user1, tokens(100), { from: deployer });
    })

    describe('deployment', () => {
        it('tracks the feeAccount', async () => {
            const result = await exchange.feeAccount();
            result.should.equal(feeAccount);
        })

        it('tracks the feePercent', async () => {
            const result = await exchange.feePercent();
            result.toString().should.equal(feePercent.toString());
        })
    })

    describe('fallback', () => {
        it('tracks depositing of tokens', async () => {
            await exchange.sendTransaction({ from: user1, value: ether(1) })
                .should.be.rejectedWith(EVM_REVERT);
        });
    })

    describe('depositing ether', () => {
        let amount = ether(10);
        let result;

        describe('success', () => {
            beforeEach(async () => {
                result = await exchange.depositEther({ from: user1, value: amount })
            })

            it('tracks depositing of tokens', async () => {
                let ehterBalance = await exchange.tokens(ETHER_ADDRESS, user1);
                ehterBalance.toString().should.equal(amount.toString());
            })

            it('emits a Deposit event', async () => {
                const log = result.logs[0]
                log.event.should.eq('Deposit');
                const event = log.args;
                event.token.toString().should.equal(ETHER_ADDRESS, "token is corect");
                event.user.toString().should.equal(user1, "from is correct");
                event.amount.toString().should.equal(amount.toString(), "amount is equal");
                event.balance.toString().should.equal(amount.toString(), "amount is equal");
            })
        })
    })

    describe('withdrawing ether', () => {
        let amount = ether(10);
        let withdrawAmount = ether(3);
        let result;

        beforeEach(async () => {
            await exchange.depositEther({ from: user1, value: amount })
        })

        describe('success', () => {
            beforeEach(async () => {
                result = await exchange.withdrawEther(withdrawAmount, { from: user1 });
            })

            it('tracks withdrawing of tokens', async () => {
                let ehterBalance = await exchange.tokens(ETHER_ADDRESS, user1);
                ehterBalance.toString().should.equal((amount - withdrawAmount).toString());
            })

            it('emits a Withdraw event', async () => {
                const log = result.logs[0];
                log.event.should.eq('Withdraw');
                const event = log.args;
                event.token.toString().should.equal(user1, "to is corect");
                event.user.toString().should.equal(ETHER_ADDRESS, "from is correct");
                event.amount.toString().should.equal(withdrawAmount.toString(), "amount is equal");
                event.balance.toString().should.equal((amount - withdrawAmount).toString(), "balance is equal");
            })
        })

        describe('failure', async () => {
            it("reject ether withdraw", async () => {
                await exchange.withdrawEther(ether(100), { from: user1 })
                    .should.be.rejectedWith(EVM_REVERT);
            })
        })
    })

    describe('depositing tokens', () => {
        let amount = tokens(10);
        let result;

        describe('success', () => {
            beforeEach(async () => {
                await token.approve(exchange.address, amount, { from: user1 });
                result = await exchange.depositToken(token.address, amount, { from: user1 })
            })

            it('tracks depositing of tokens', async () => {
                let balance;
                balance = await token.balanceOf(exchange.address)
                balance.toString().should.equal(amount.toString());
                let tokenBalance = await exchange.tokens(token.address, user1);
                tokenBalance.toString().should.equal(amount.toString());
            })

            it('emits a Deposit event', async () => {
                const log = result.logs[0]
                log.event.should.eq('Deposit');
                const event = log.args;
                event.token.toString().should.equal(token.address, "token is corect");
                event.user.toString().should.equal(user1, "from is correct");
                event.amount.toString().should.equal(amount.toString(), "amount is equal");
                event.balance.toString().should.equal(amount.toString(), "amount is equal");
            })
        })

        describe('failure', () => {
            it("reject ether deposit", async () => {
                await exchange.depositToken(ETHER_ADDRESS, amount, { from: user1 })
                    .should.be.rejectedWith(EVM_REVERT);
            })

            it("rejects when its not approved", async () => {
                await exchange.depositToken(token.address, amount, { from: user1 })
                    .should.be.rejectedWith(EVM_REVERT);
            })
        })
    })

    describe('withdrawing token', () => {
        let amount = ether(10);
        let withdrawAmount = ether(3);
        let result;

        beforeEach(async () => {
            await exchange.depositEther({ from: user1, value: amount })
        })

        describe('success', () => {
            beforeEach(async () => {
                await token.approve(exchange.address, amount, { from: user1 });
                await exchange.depositToken(token.address, amount, { from: user1 })
                result = await exchange.withdrawToken(token.address, withdrawAmount, { from: user1 });
            })

            it('tracks withdrawing of tokens', async () => {
                let ehterToken = await exchange.tokens(token.address, user1);
                ehterToken.toString().should.equal((amount - withdrawAmount).toString());
                let balance = await token.balanceOf(user1);
                balance.toString().should.equal((ether(100) - (amount - withdrawAmount)).toString());
            })

            it('emits a Withdraw event', async () => {
                const log = result.logs[0];
                log.event.should.eq('Withdraw');
                const event = log.args;
                event.token.toString().should.equal(user1, "to is corect");
                event.user.toString().should.equal(token.address, "from is correct");
                event.amount.toString().should.equal(withdrawAmount.toString(), "amount is equal");
                event.balance.toString().should.equal((amount - withdrawAmount).toString(), "balance is equal");
            })
        })

        describe('failure', async () => {
            it("reject ether deposit", async () => {
                await exchange.withdrawToken(ETHER_ADDRESS, amount, { from: user1 })
                    .should.be.rejectedWith(EVM_REVERT);
            })


            it("reject ether withdraw", async () => {
                await exchange.withdrawToken(token.address, ether(100), { from: user1 })
                    .should.be.rejectedWith(EVM_REVERT);
            })
        })
    })


    describe('checking balances', () => {
        beforeEach(async () => {
            await exchange.depositEther({ from: user1, value: ether(1) })
        })

        it('returns user balance', async () => {
            const result = await exchange.balanceOf(ETHER_ADDRESS, user1)
            result.toString().should.equal(ether(1).toString())
        })
    })

    describe('making orders', () => {
        let result

        beforeEach(async () => {
            result = await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(1), { from: user1 })
        })

        it('tracks the newly created order', async () => {
            const orderCount = await exchange.orderCount()
            orderCount.toString().should.equal('1')
            const order = await exchange.orders('1')
            order.id.toString().should.equal('1', 'id is correct')
            order.user.should.equal(user1, 'user is correct')
            order.tokenGet.should.equal(token.address, 'tokenGet is correct')
            order.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
            order.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
            order.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
            order.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
        })

        it('emits an "Order" event', () => {
            const log = result.logs[0]
            log.event.should.eq('Order')
            const event = log.args
            event.id.toString().should.equal('1', 'id is correct')
            event.user.should.equal(user1, 'user is correct')
            event.tokenGet.should.equal(token.address, 'tokenGet is correct')
            event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
            event.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
            event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
            event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
        })
    })

    describe('order actions', () => {

        beforeEach(async () => {
            // user1 deposits ether only
            await exchange.depositEther({ from: user1, value: ether(1) })
            // give tokens to user2
            await token.transfer(user2, tokens(100), { from: deployer })
            // user2 deposits tokens only
            await token.approve(exchange.address, tokens(2), { from: user2 })
            await exchange.depositToken(token.address, tokens(2), { from: user2 })
            // user1 makes an order to buy tokens with Ether
            await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(1), { from: user1 })
        })

        describe('filling orders', () => {
            let result

            describe('success', () => {
                beforeEach(async () => {
                    // user2 fills order
                    result = await exchange.fillOrder('1', { from: user2 })
                })
                //user2 should receive 10% less ether
                it('executes the trade & charges fees', async () => {
                    let balance
                    balance = await exchange.balanceOf(token.address, user1)
                    balance.toString().should.equal(tokens(1).toString(), 'user1 received tokens')
                    balance = await exchange.balanceOf(ETHER_ADDRESS, user2)
                    balance.toString().should.equal(ether(1).toString(), 'user2 received Ether')
                    balance = await exchange.balanceOf(ETHER_ADDRESS, user1)
                    balance.toString().should.equal('0', 'user1 Ether deducted')
                    balance = await exchange.balanceOf(token.address, user2)
                    balance.toString().should.equal(tokens(0.9).toString(), 'user2 tokens deducted with fee applied')
                    const feeAccount = await exchange.feeAccount()
                    balance = await exchange.balanceOf(token.address, feeAccount)
                    balance.toString().should.equal(tokens(0.1).toString(), 'feeAccount received fee')
                })

                it('updates filled orders', async () => {
                    const orderFilled = await exchange.orderFilled(1)
                    orderFilled.should.equal(true)
                })

                it('emits a "Trade" event', () => {
                    const log = result.logs[0]
                    log.event.should.eq('Trade')
                    const event = log.args
                    event.id.toString().should.equal('1', 'id is correct')
                    event.user.should.equal(user1, 'user is correct')
                    event.tokenGet.should.equal(token.address, 'tokenGet is correct')
                    event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
                    event.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
                    event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
                    event.userFill.should.equal(user2, 'userFill is correct')
                    event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
                })
            })

            describe('failure', () => {

                it('rejects invalid order ids', () => {
                    const invalidOrderId = 99999
                    exchange.fillOrder(invalidOrderId, { from: user2 }).should.be.rejectedWith(EVM_REVERT)
                })

                it('rejects already-filled orders', () => {
                    // Fill the order
                    exchange.fillOrder('1', { from: user2 }).should.be.fulfilled
                    // Try to fill it again
                    exchange.fillOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
                })

                it('rejects cancelled orders', () => {
                    // Cancel the order
                    exchange.cancelOrder('1', { from: user1 }).should.be.fulfilled
                    // Try to fill the order
                    exchange.fillOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
                })
            })
        })

        describe('cancelling orders', () => {
            let result

            describe('success', async () => {
                beforeEach(async () => {
                    result = await exchange.cancelOrder('1', { from: user1 })
                })

                it('updates cancelled orders', async () => {
                    const orderCancelled = await exchange.orderCancelled(1)
                    orderCancelled.should.equal(true)
                })

                it('emits a "Cancel" event', () => {
                    const log = result.logs[0]
                    log.event.should.eq('Cancel')
                    const event = log.args
                    event.id.toString().should.equal('1', 'id is correct')
                    event.user.should.equal(user1, 'user is correct')
                    event.tokenGet.should.equal(token.address, 'tokenGet is correct')
                    event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
                    event.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
                    event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
                    event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
                })
            })

            describe('failure', () => {
                it('rejects invalid order ids', () => {
                    const invalidOrderId = 99999
                    exchange.cancelOrder(invalidOrderId, { from: user1 }).should.be.rejectedWith(EVM_REVERT)
                })

                it('rejects unauthorized cancelations', async () => {
                    // Try to cancel the order from another user
                    await exchange.cancelOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
                })
            })
        })
    })

    describe('fillOrder()', () => {
        describe('Check balances after filling user1 buy Tokens order', () => {
            beforeEach(async () => {
                // user1 deposit 1 ETHER to the exchange
                await exchange.depositEther({ from: user1, value: ether(1) })
                // user1 create order to buy 10 tokens for 1 ETHER
                await exchange.makeOrder(token.address, tokens(10), ETHER_ADDRESS, ether(1), { from: user1 })
                // user2 gets tokens
                await token.transfer(user2, tokens(11), { from: deployer })
                // user2 approve exchange to spend his tokens
                await token.approve(exchange.address, tokens(11), { from: user2 })
                // user2 deposit tokens + fee cost (1 token) to the exchange
                await exchange.depositToken(token.address, tokens(11), { from: user2 })
                // user2 fills the order
                await exchange.fillOrder('1', { from: user2 })
            })

            it('user1 tokens balance on exchange should eq. 10', async () => {
                await (await exchange.balanceOf(token.address, user1)).toString().should.eq(tokens(10).toString())
            })

            it('user1 ether balance on exchange should eq. 0', async () => {
                await (await exchange.balanceOf(ETHER_ADDRESS, user1)).toString().should.eq('0')
            })

            it('user2 tokens balance on exchange should eq. 0', async () => {
                await (await exchange.balanceOf(token.address, user2)).toString().should.eq('0')
            })

            it('user2 ether balance on exchange should eq. 1', async () => {
                await (await exchange.balanceOf(ETHER_ADDRESS, user2)).toString().should.eq(ether(1).toString())
            })
        })

        describe('Check balances after filling user1 buy Ether order', () => {
            beforeEach(async () => {
                // Uuser1 Gets the 10 tokens
                await token.transfer(user1, tokens(10), { from: deployer })
                // user1 approve exchange to spend his tokens
                await token.approve(exchange.address, tokens(10), { from: user1 })
                // user1 approve send tokens to the exchange 
                await exchange.depositToken(token.address, tokens(10), { from: user1 })
                // user1 create order to buy 1 Ether for 10 tokens
                await exchange.makeOrder(ETHER_ADDRESS, ether(1), token.address, tokens(10), { from: user1 })
                // user2 deposit 1 ETHER + fee cost (.1 ETH) to the exchange
                await exchange.depositEther({ from: user2, value: ether(1.1) })
                // user2 fills the order
                await exchange.fillOrder('1', { from: user2 })
            })

            it('user1 tokens balance on exchange should eq. 0', async () => {
                await (await exchange.balanceOf(token.address, user1)).toString().should.eq('0')
            })

            it('user1 Ether balance on exchange should eq. 1', async () => {
                await (await exchange.balanceOf(ETHER_ADDRESS, user1)).toString().should.eq(ether(1).toString())
            })

            it('user2 tokens balance on exchange should eq. 10', async () => {
                await (await exchange.balanceOf(token.address, user2)).toString().should.eq(tokens(10).toString())
            })

            it('user2 ether balance on exchange should eq. 0', async () => {
                await (await exchange.balanceOf(ETHER_ADDRESS, user2)).toString().should.eq('0')
            })
        })
    })
});