import expect = require('expect.js');
import request = require('request');
import KiiGatewayAgent = require('./index');

// const appID = 'f1e14d7c';
// const appKey = 'b5727ac2e89ff44268fd628c12da7d61';
// const site = 'https://api-sg.kii.com';
// const ownerToken = 'L_tj-jtSjDNYj1mRtJFKBD3eA5_x68AiFYQswS35TlA';
// const ownerID = 'ba28b2d34b60-270b-6e11-e3dd-0240f4e2';

const appID = 'a333fe49';
const appKey = 'ddab3f01d0eda5b73051c660134359fc';
const site = 'https://api-sg.kii.com';
const ownerToken = 'h6QKPtb8S2THnUusf6xMCXUv2MWzmRbZY8TVf0_Mzxc';
const ownerID = '7c698b427320-f689-6e11-91ed-00c48d05';

const gatewayThingID = 'th.ba28b2d34b60-8e0a-6e11-8a8f-06579ddf';
const endnodeThingID = 'th.ba28b2d34b60-8e0a-6e11-9a8f-0c795266';

describe('Kii Gateway Agent', () => {
  let gatewayAgent = new KiiGatewayAgent();

  describe('.setApp()', () => {
    it('should set appID, appKey, site', done => {
      gatewayAgent.setTemporaryApp(appID, appKey, site);
      done();
    })
  });

  describe('.setUser()', () => {
    it('should set userId, userToken', done => {
      gatewayAgent.setTemporaryUser(ownerToken, ownerID);
      done();
    })
  });

  describe('.onboardGatewayByOwner()', () => {
    let result
    beforeEach(done => {
      gatewayAgent.onboardGatewayByOwner()
        .then(chainOutput => {
          result = chainOutput
          done();
        }, error => {
          console.log(error);
          done();
        })
    })
    it('should onboard gateway', () => {
      expect(result.thingID).to.be(gatewayThingID);
      expect(result.mqttEndpoint).to.be.an('object');
    })
  });

  describe('.onboardEndnodeByOwner()', () => {
    let result
    beforeEach(done => {
      gatewayAgent.onboardEndnodeByOwner(
        'Donkey', // endnode vendorThingID
        undefined // endnode properties
      ).then(chainOutput => {
        result = chainOutput;
        done();
      }, error => {
        console.log(error);
        done();
      })
    })
    it('should onboard end node', () => {
      expect(result.thingID).to.be(endnodeThingID)
    })
  });

  describe('.updateEndnodeState()', () => {
    let result;
    beforeEach(done => {
      let node = gatewayAgent.getEndnode('Donkey');
      gatewayAgent.updateEndnodeState(
        node, // endnode vendorThingID
        {
          'activeTotal': 123,
          'activeMD': 0,
          'apparentTotal': 456,
          'Timestamp': new Date().valueOf(),
          'deviceID': 'Donkey1',
          'apparentMD': 0,
          'apparentTotalChange': 0,
          'activeTotalChange': 0
        } // endnode states
      ).then(chainOutput => {
        result = chainOutput;
        done();
      }, error => {
        console.log(error);
        done();
      })
    })
    it('should update endnode states', () => {
      expect(result).to.be(204);
    })
  });

  // describe('.updateEndnodeConnectivityBythingID()', () => {
  //   let result
  //   beforeEach(done => {
  //     gatewayAgent.updateEndnodeConnectivityBythingID(
  //       endnodeThingID, // endnode thingID
  //       true //online
  //     ).then(chainOutput => {
  //       result = chainOutput
  //       done();
  //     }, error => {
  //       console.log(error);
  //       done();
  //     })
  //   })
  //   it('should update endnode connection status', () => {
  //     expect(result).to.be(204);
  //   })
  // });

  describe('.detectEndnodeOnboardingStatus()', () => {
    let donkey;
    let notExistingDonkey;
    beforeEach(done => {
      donkey = gatewayAgent.getEndnode('Donkey');
      notExistingDonkey = gatewayAgent.getEndnode('notExistingDonkey');
      done();
    })
    it('should return if endnode is onboarding or not', () => {
      expect(donkey).to.be.an('object')
      expect(notExistingDonkey).to.be(undefined)
    })
  });

  // describe('.updateEndnodeOnline()', () => {
  //   beforeEach(done => {
  //     gatewayAgent.updateEndnodeOnline()
  //       .then(chainOutput => {
  //         done();
  //       }, error => {
  //         console.log(error);
  //         done();
  //       })
  //   })
  //   it('should update local endnode connectivity', done => {
  //     done();
  //   })
  // });
})
