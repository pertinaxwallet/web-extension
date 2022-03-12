<script>
  import { onMount, getContext } from "svelte";
  import { fade } from "svelte/transition";
  import { Tabs, Tab, Icon, Button } from "svelte-chota";
  import { _ } from "svelte-i18n";

  let active_tab = "tx";

  /* Icons https://materialdesignicons.com/ */
  import {
    mdiCog,
    mdiContentCopy,
    mdiPencil,
    mdiEye,
    mdiDelete,
    mdiCartArrowDown,
    mdiGift,
    //mdiSwapVertical,
    mdiBriefcaseUpload,
    mdiArrowTopRight,
    mdiArrowBottomLeft,
    mdiAlertCircle,
  } from "@mdi/js";

  import {
    accountStore,
    currentAccount,
    currentNetwork,
  } from "../../../common/stores.js";

  import {
    shortAddress,
    copyToClipboard,
    fromNano,
    fromDecimal,
  } from "../../../common/utils.js";

  //Context
  const { openModal } = getContext("app_functions");

  let balance = 0;
  let showDeploy = false;
  let showBuy = false;
  let showGiver = false;
  let error = "";
  let giverLoading = false;
  let deployLoading = false;
  let transactions = [];
  let assets = [];

  onMount(() => {
    balance = $currentAccount.balance[$currentNetwork.server]
      ? fromNano($currentAccount.balance[$currentNetwork.server])
      : 0;
    checkBalance($currentAccount.address, $currentNetwork.server);
    getTransactions($currentAccount.address, $currentNetwork.server, 10, 1);
    getTokenList($currentAccount.address, $currentNetwork.server);
  });

  const walletUIUpdateListener = (message) => {
    if (message.type === "updateWalletUI") {
      checkBalance($currentAccount.address, $currentNetwork.server);
      getTransactions($currentAccount.address, $currentNetwork.server, 10, 1);
      getTokenList($currentAccount.address, $currentNetwork.server);
    }
  };

  browser.runtime.onMessage.addListener(walletUIUpdateListener);

  $: showDeploy = $currentAccount.deployed
    ? !$currentAccount.deployed.includes($currentNetwork.server)
    : false;
  $: showBuy = !$currentNetwork.test;
  $: showGiver = $currentNetwork.test && $currentNetwork.giver != "";

  const copyAddress = (event) => {
    copyToClipboard($currentAccount.address);
    const element = event.currentTarget;
    element.classList.toggle("fade-half");
    setTimeout(() => {
      element.classList.toggle("fade-half");
    }, 1000);
  };

  const checkBalance = (accountAddress, server) => {
    browser.runtime
      .sendMessage({
        type: "getCurrentBalance",
        data: { accountAddress: accountAddress, server: server },
      })
      .then((result) => {
        balance = fromNano(result);
      })
      .catch((e) => {
        balance = 0;
        console.log(e); // here don't need to show any error for user, usually it is the network issue in the development environment
      });
  };

  const getTransactions = (accountAddress, server, count, page) => {
    browser.runtime
      .sendMessage({
        type: "getTransactions",
        data: {
          accountAddress: accountAddress,
          server: server,
          count: count,
          page: page,
        },
      })
      .then((result) => {
        transactions = result;
      })
      .catch((e) => {
        console.log(e); // here don't need to show any error for user, usually it is the network issue in the development environment
      });
  };

  const getTokenList = (accountAddress, server) => {
    browser.runtime
      .sendMessage({
        type: "tokenList",
        data: {
          accountAddress: accountAddress,
          server: server,
        },
      })
      .then((result) => {
        assets = result;
      })
      .catch((e) => {
        console.log(e); // here don't need to show any error for user, usually it is the network issue in the development environment
      });
  };

  currentAccount.subscribe((value) => {
    balance = value.balance[$currentNetwork.server]
      ? fromNano(value.balance[$currentNetwork.server])
      : 0;
    checkBalance(value.address, $currentNetwork.server);
    getTransactions(value.address, $currentNetwork.server, 10, 1);
    getTokenList(value.address, $currentNetwork.server);
    giverLoading = false;
    deployLoading = false;
  });

  currentNetwork.subscribe((value) => {
    balance = $currentAccount.balance[$currentNetwork.server]
      ? fromNano($currentAccount.balance[$currentNetwork.server])
      : 0;
    checkBalance($currentAccount.address, value.server);
    getTransactions($currentAccount.address, value.server, 10, 1);
    getTokenList($currentAccount.address, value.server);
    giverLoading = false;
    deployLoading = false;
  });

  const editNickname = () => {
    openModal("ModalEditNickname");
  };

  const viewAddressOnExplorer = () => {
    browser.tabs.create({
      url: `${$currentNetwork.explorer}/accounts/accountDetails?id=${$currentAccount.address}`,
    });
  };

  const viewTransactionOnExplorer = (txId) => {
    browser.tabs.create({
      url: `${$currentNetwork.explorer}/transactions/transactionDetails?id=${txId}`,
    });
  };

  const deleteAccount = () => {
    openModal("ModalDeleteAccount");
  };

  const buy = () => {
    browser.tabs.create({
      url: "https://coinmarketcap.com/currencies/everscale/markets/",
    });
  };

  const giver = () => {
    giverLoading = true;
    browser.runtime
      .sendMessage({
        type: "takeFromGiver",
        data: {
          accountAddress: $currentAccount.address,
          server: $currentNetwork.server,
        },
      })
      .then((result) => {
        giverLoading = false;
        if (result.error) {
          openModal("ModalError", { message: result.error });
        } else {
          if (!result.added) {
            openModal("ModalError", { message: result.reason });
          } else {
            checkBalance($currentAccount.address, $currentNetwork.server);
            openModal("ModalSuccess", { message: "Amount is received" });
          }
        }
      });
  };
  /*
  const swap = () => {
    //show enrolling form
    browser.tabs.create({ url: "https://docs.google.com/forms/d/e/1FAIpQLSeDZwc8cvMKhjQc2PzTiqNCJ31oAqvhzbO6IEWBv1CBu2b3LA/viewform" });
  };
  */
  const sendTransactionEver = () => {
    openModal("ModalSendingTransaction");
  };

  const sendTransactionToken = (tokenObject) => {
    if (tokenObject.icon == "") {
      tokenObject.icon = "/assets/img/icon-token-128.png";
    }
    openModal("ModalSendingTransaction", { token: tokenObject });
  };

  const deploy = () => {
    deployLoading = true;
    browser.runtime
      .sendMessage({
        type: "deployNewWallet",
        data: {
          accountAddress: $currentAccount.address,
          server: $currentNetwork.server,
        },
      })
      .then((result) => {
        deployLoading = false;
        if (!result.success) {
          openModal("ModalError", { message: result.reason });
          if (result.alreadyDeployed) {
            const newCurrentAccount = $currentAccount;
            newCurrentAccount.deployed.push($currentNetwork.server);
            accountStore.changeAccount(newCurrentAccount);
          }
        } else {
          openModal("ModalSuccess", {
            message: "The wallet has been deployed",
          });
          const newCurrentAccount = $currentAccount;
          newCurrentAccount.deployed.push($currentNetwork.server);
          accountStore.changeAccount(newCurrentAccount);
        }
      });
  };

  const importToken = () => {
    openModal("ModalImportToken");
  };
</script>

<style lang="scss">
  .flow-content-left {
    width: 300px;
  }
  .flow-content-right {
    padding: 0px;
    width: auto;
  }
  .nickname,
  .address {
    font-size: 1.5rem;
    text-align: center;
  }
  .nickname {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .address {
    font-weight: bold;
  }
  .token-logo {
    width: 48px;
    height: 48px;
    border: var(--color-black) dashed 1px;
    margin: 0.5rem;
    border-radius: 50%;
  }
  .account-header {
    border-bottom: #d0d0d0 dashed 1px;
    padding-bottom: 0.5rem;
  }
  .account-balance {
    padding-top: 1rem;
  }
  .account-actions {
    width: 30rem;
  }
  :global(.account-settings .card) {
    left: -14rem !important;
    font-size: 1.5rem;
    opacity: 0.9;
    width: 12.5rem;
  }
  :global(.account-settings .button.outline.icon .lefticon) {
    margin: 0px;
    margin-top: 0.5rem;
  }
  :global(.account-settings summary:focus, .account-settings
      .button.outline.icon
      .lefticon:focus) {
    outline: none;
  }
  :global(.account-settings .button.outline.icon) {
    border: none;
    padding: 0.5rem 0px;
  }
  :global(.account-settings .account-settings-item) {
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  :global(.action-button) {
    background-color: var(--color-primary);
    color: var(--color-white);
  }
  :global(.account-tabs) {
    margin-top: 1rem;
  }
  :global(.account-tabs a) {
    width: 50%;
  }
  :global(.account-balance-amount) {
    font-weight: bold;
    margin-top: 2rem;
    margin-bottom: 2rem;
  }
  .account-assets,
  .account-tx {
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px dashed var(--color-black);
    cursor: pointer;
  }
  .asset-logo {
    width: 32px;
    height: 32px;
    margin: 0.5rem;
    border-radius: 50%;
  }
  .account-tx {
    justify-content: left;
    .tx-data {
      flex-direction: column;
      display: flex;
      width: 150px;
      .tx-date {
        font-size: 1rem;
      }
    }
    .tx-type {
      align-items: center;
      display: flex;
      width: 40px;
      cursor: pointer;
    }
    .tx-balance {
      width: 115px;
    }
  }
  .account-tx-wrapper {
    max-height: 17rem;
    overflow: hidden;
    .account-tx-wrapper-scroll {
      max-height: 17rem;
      overflow-y: auto;
      width: calc(100% + 20px);
    }
  }
  .token-list-wrapper {
    max-height: 17rem;
    overflow: hidden;
    padding: 0px;
    width: 100%;
    .token-list-wrapper-scroll {
      max-height: 17rem;
      overflow-y: auto;
      padding: 0px;
      width: calc(100% + 20px);
    }
  }
  .import-asset {
    padding: 1rem;
  }
  .token-image {
    width: 3rem;
    height: 3rem;
  }
</style>

<div class="flex-row account-header" in:fade={{ delay: 0, duration: 200 }}>
  <div
    class="flex-column flow-content-left copy-text"
    on:click={(e) => copyAddress(e)}>
    <div class="nickname" title={$currentAccount.nickname}>
      {$currentAccount.nickname}
    </div>
    <div class="address">
      <span title={$currentAccount.address}>
        {shortAddress($currentAccount.address)}
      </span>
    </div>
  </div>
  <div class="flex-column flow-content-right">
    <div class="account-settings">
      <Button dropdown="" autoclose outline icon={mdiCog}>
        <div class="account-settings-item" on:click={() => editNickname()}>
          <Icon src={mdiPencil} size="1" color="var(--color-black)" />
          {$_('Edit nickname')}
        </div>
        <div
          class="account-settings-item"
          on:click={() => viewAddressOnExplorer()}>
          <Icon src={mdiEye} size="1" color="var(--color-black)" />
          {$_('View on explorer')}
        </div>
        <div class="account-settings-item" on:click={() => deleteAccount()}>
          <Icon src={mdiDelete} size="1" color="var(--color-black)" />
          {$_('Delete account')}
        </div>
      </Button>
    </div>
  </div>
</div>
<div
  class="flex-row is-horizontal-align account-balance"
  in:fade={{ delay: 0, duration: 200 }}>
  <div class="flex-column">
    <div class="flex-row is-horizontal-align">
      <img src="/assets/img/icon-ever-128.png" class="token-logo" alt="logo" />
    </div>
    <div class="flex-row is-horizontal-align account-balance-amount">
      {balance}
      {$currentNetwork.coinName}
    </div>
    <div class="flex-row is-horizontal-align account-actions">
      {#if showBuy}
        <Button
          disable
          title={$_('Buy')}
          class="action-button is-rounded"
          on:click={() => {
            buy();
          }}
          icon={mdiCartArrowDown} />
      {/if}
      {#if showGiver}
        <Button
          title={$_('Giver')}
          class="action-button is-rounded"
          loading={giverLoading}
          on:click={() => {
            giver();
          }}
          icon={mdiGift} />
      {/if}
      <!--
      <Button
        disabled
        title={$_('Swap')}
        class="action-button is-rounded"
        on:click={() => {swap();}}
        icon={mdiSwapVertical} />
      -->
      {#if showDeploy}
        <Button
          title={$_('Deploy')}
          class="action-button is-rounded"
          loading={deployLoading}
          on:click={() => {
            deploy();
          }}
          icon={mdiBriefcaseUpload} />
      {:else}
        <Button
          title={$_('Send transaction')}
          class="action-button is-rounded"
          on:click={() => {
            sendTransactionEver();
          }}
          icon={mdiArrowTopRight} />
      {/if}
    </div>
  </div>
</div>

<Tabs class="account-tabs" bind:active={active_tab}>
  <Tab tabid="assets">{$_('Assets')}</Tab>
  <Tab tabid="tx">{$_('Transactions')}</Tab>
</Tabs>
{#if active_tab == 'assets'}
  <div class="token-list-wrapper">
    <div class="token-list-wrapper-scroll">
      <div
        class="flex-row is-horizontal-align account-assets"
        on:click={() => {
          sendTransactionEver();
        }}>
        <img
          src="/assets/img/icon-ever-128.png"
          class="asset-logo"
          alt="logo" />
        <span class="asset-balance is-center">
          {balance}
          {$currentNetwork.coinName}
          ({$_('Native')})
        </span>
      </div>
      {#each assets as asset}
        <div
          class="flex-row is-horizontal-align account-assets"
          on:click={() => {
            sendTransactionToken(asset);
          }}>
          <img
            src={asset.icon != '' ? asset.icon : '/assets/img/icon-token-128.png'}
            class="asset-logo"
            title={asset.address}
            alt="logo" />
          <span class="asset-balance is-center">
            {fromDecimal(asset.balance, asset.decimals)}
            &nbsp;
            <span title={asset.name}>{asset.symbol}</span>
            &nbsp; ({$_('Type')}
            &nbsp;
            {asset.type})
          </span>
        </div>
      {/each}
      <div class="flex-row is-horizontal-align import-asset">
        <a href={'#'} on:click={() => importToken()}>{$_('Import token')}</a>
      </div>
    </div>
  </div>
{/if}
{#if active_tab == 'tx'}
  <div class="account-tx-wrapper">
    <div class="account-tx-wrapper-scroll">
      {#each transactions as tx}
        <div
          class="flex-row is-horizontal-align account-tx"
          data-hash={tx.new_hash}>
          <span class="tx-type">
            {#if tx.type == 'deploy'}
              <Icon
                class="action-button"
                src={mdiBriefcaseUpload}
                size="2"
                on:click={() => viewTransactionOnExplorer(tx.id)} />
            {/if}
            {#if tx.type == 'tokenTransfer'}
              <img
                alt=""
                class="action-button token-image"
                src={typeof tx.icon != 'undefined' && tx.icon != '' ? tx.icon : '/assets/img/icon-token-128.png'}
                on:click={() => viewTransactionOnExplorer(tx.id)} />
            {/if}
            {#if tx.type == 'tokenIncoming'}
              <img
                alt=""
                class="action-button token-image"
                src={typeof tx.icon != 'undefined' && tx.icon != '' ? tx.icon : '/assets/img/icon-token-128.png'}
                on:click={() => viewTransactionOnExplorer(tx.id)} />
            {/if}
            {#if tx.type == 'transfer'}
              <Icon
                class="action-button"
                src={mdiArrowTopRight}
                size="2"
                on:click={() => viewTransactionOnExplorer(tx.id)} />
            {/if}
            {#if tx.type == 'incoming'}
              <Icon
                class="action-button"
                src={mdiArrowBottomLeft}
                size="2"
                on:click={() => viewTransactionOnExplorer(tx.id)} />
            {/if}
            {#if tx.type == 'error'}
              <Icon
                class="action-button"
                src={mdiAlertCircle}
                size="2"
                on:click={() => viewTransactionOnExplorer(tx.id)} />
            {/if}
          </span>
          <span class="tx-data">
            <span class="tx-name">{$_(tx.type)}</span>
            <span
              class="tx-date">{new Date(tx.now * 1000).toLocaleString()}</span>
          </span>
          <span class="tx-balance is-left" title={tx.amount}>
            {fromNano(tx.amount)}
            {tx.coinName}
          </span>
        </div>
      {/each}
    </div>
  </div>
{/if}
