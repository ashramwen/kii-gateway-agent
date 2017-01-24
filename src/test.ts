import expect = require('expect.js');
import request = require('request');
import GatewayAgent = require('./index');

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

const gatewayThingID = 'th.ba28b2d34b60-3deb-6e11-412e-0e56ca79';
const endnodeThingID = 'th.ba28b2d34b60-3deb-6e11-412e-0dad41ca';

describe('Kii Gateway Agent', () => {
  let gatewayAgent = new GatewayAgent.KiiGatewayAgent();
  describe('.init()', () => {
    it('should set appID, appKey, site', done => {
      gatewayAgent.init(appID, appKey, site);
      // expect(gatewayAgent.appID).to.be(appID);
      // expect(gatewayAgent.appKey).to.be(appKey);
      // expect(gatewayAgent.site).to.be(site);
      done();
    })
  });

  describe('.setUser()', () => {
    it('should set userId, userToken', done => {
      gatewayAgent.setUser(ownerToken, ownerID);
      // expect(gatewayAgent.appID).to.be(appID);
      // expect(gatewayAgent.appKey).to.be(appKey);
      // expect(gatewayAgent.site).to.be(site);
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
        result = chainOutput
        done()
      }, error => {
        console.log(error);
      })
    })
    it('should onboard end node', () => {
      expect(result.thingID).to.be(endnodeThingID)
    })
  });

  describe('.updateEndnodeState()', () => {
    let result
    beforeEach(done => {
      gatewayAgent.updateEndnodeState(
        endnodeThingID, // endnode thingID
        {
          'batteryAlias': {
            'power': true
          },
          'lampAlias': {
            'power': true
          }
        } // endnode states
      ).then(chainOutput => {
        result = chainOutput
        done()
      }, error => {
        console.log(error);
      })
    })
    it('should update endnode states', () => {
      expect(result).to.be(204);
    })
  });

  describe('.updateEndnodeConnectivity()', () => {
    let result
    beforeEach(done => {
      gatewayAgent.updateEndnodeConnectivity(
        endnodeThingID, // endnode thingID
        true //online
      ).then(chainOutput => {
        result = chainOutput
        done()
      }, error => {
        console.log(error);
      })
    })
    it('should update endnode connection status', () => {
      expect(result).to.be(204);
    })
  });

  describe('.detectEndnodeOnboardingStatus()', () => {
    let donkey;
    let notExistingDonkey;
    beforeEach(done => {
      donkey = gatewayAgent.detectEndnodeOnboardingStatus('Donkey');
      notExistingDonkey = gatewayAgent.detectEndnodeOnboardingStatus('notExistingDonkey');
      done();
    })
    it('should return if endnode is onboarding or not', () => {
      expect(donkey).to.be.an('object')
      expect(notExistingDonkey).to.be(undefined)
    })
  });
})
